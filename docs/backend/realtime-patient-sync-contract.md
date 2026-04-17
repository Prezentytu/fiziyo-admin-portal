# Backend Contract: Real-time patient assignment sync

Ten dokument opisuje kontrakt GraphQL (HotChocolate / .NET 9) i mechanizm
emisji eventow, ktore backend musi wystawic, zeby aplikacja mobilna FiziYo
otrzymywala push-update'y po edycjach wykonanych w panelu admina.

Status: **TO BE IMPLEMENTED** w backend repo.

## 1. Cel

Po kazdej zmianie danych widocznych dla pacjenta (przypisanie, override, mapping
w PATIENT_PLAN, edycja szablonu cwiczenia uzywanego w PATIENT_PLAN) backend
musi wyemitowac event do **konkretnego pacjenta** przez WebSocket subscription
`onMyAssignmentChanged`. Topic jest skopowany per-user, co zapewnia bezpieczenstwo
(pacjent nie subskrybuje calej organizacji) i niski narzut sieciowy.

## 2. Schemat GraphQL (do dodania)

```graphql
type AssignmentChangeEvent {
  assignmentId: String!
  userId: String!
  changeType: AssignmentChangeType!
  exerciseSetId: String
  mappingId: String
  exerciseId: String
  changedAt: DateTime!
}

enum AssignmentChangeType {
  ASSIGNMENT_CREATED
  ASSIGNMENT_UPDATED
  ASSIGNMENT_DELETED
  OVERRIDES_UPDATED
  MAPPING_ADDED
  MAPPING_UPDATED
  MAPPING_REMOVED
  EXERCISE_TEMPLATE_UPDATED
}

extend type Subscription {
  onMyAssignmentChanged: AssignmentChangeEvent!
}
```

## 3. HotChocolate implementation

```csharp
// SubscriptionsRoot.cs (lub podobny plik z subskrypcjami)

[Subscribe(With = nameof(SubscribeToMyAssignmentChanged))]
[Authorize]
public AssignmentChangeEvent OnMyAssignmentChanged(
    [EventMessage] AssignmentChangeEvent payload) => payload;

public ValueTask<ISourceStream<AssignmentChangeEvent>> SubscribeToMyAssignmentChanged(
    [Service] ITopicEventReceiver receiver,
    [GlobalState("currentUserId")] string userId,
    CancellationToken ct)
    => receiver.SubscribeAsync<AssignmentChangeEvent>(
        TopicFor(userId),
        ct);

public static string TopicFor(string userId) => $"OnMyAssignmentChanged_{userId}";

public record AssignmentChangeEvent(
    string AssignmentId,
    string UserId,
    AssignmentChangeType ChangeType,
    string? ExerciseSetId,
    string? MappingId,
    string? ExerciseId,
    DateTime ChangedAt);

public enum AssignmentChangeType
{
    AssignmentCreated,
    AssignmentUpdated,
    AssignmentDeleted,
    OverridesUpdated,
    MappingAdded,
    MappingUpdated,
    MappingRemoved,
    ExerciseTemplateUpdated,
}
```

### Bezpieczenstwo

- `[Authorize]` wymusza zalogowanego usera.
- `[GlobalState("currentUserId")]` wyciaga userId z JWT/HttpContext **po stronie
  serwera** - klient nie moze go nadpisac.
- Topic jest stringiem zawierajacym userId, wiec nasluch jest skopowany do
  jednego usera. Pacjent A nie moze sluchac topicu pacjenta B.

## 4. Emisja eventow z mutacji

W kazdej mutacji modyfikujacej dane widoczne dla pacjenta wstrzyknac
`ITopicEventSender` i po sukcesie commitu wyslac event do **wszystkich
dotknietych userow**.

### 4.1 Mapowanie mutacji -> odbiorcy

| Mutacja                           | ChangeType              | Odbiorcy (wyznaczanie userId)                                                     |
| --------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `assignExerciseSetToPatient`      | AssignmentCreated       | `patientId` z argumentow                                                          |
| `updateExerciseSetAssignment`     | AssignmentUpdated       | `PatientAssignment.UserId` (po assignmentId)                                      |
| `removeExerciseSetAssignment`     | AssignmentDeleted       | `PatientAssignment.UserId` przed usunieciem                                       |
| `updatePatientExerciseOverrides`  | OverridesUpdated        | `PatientAssignment.UserId`                                                        |
| `addExerciseToSet` (PATIENT_PLAN) | MappingAdded            | wszystkie `PatientAssignment.UserId` przez `ExerciseSet.PatientAssignments`       |
| `updateExerciseInSet`             | MappingUpdated          | jw.; dla TEMPLATE/REUSABLE - wszystkie assignments uzywajace tego setu            |
| `removeExerciseFromSet`           | MappingRemoved          | jw.                                                                               |
| `updateExercise`                  | ExerciseTemplateUpdated | wszystkie `PatientAssignment.UserId` przez `ExerciseSetMapping.ExerciseId == @id` |

### 4.2 Wzorzec emisji

```csharp
public class UpdateExerciseInSetHandler
{
    private readonly AppDbContext _db;
    private readonly ITopicEventSender _eventSender;

    public async Task<ExerciseSetMapping> ExecuteAsync(
        UpdateExerciseInSetInput input,
        CancellationToken ct)
    {
        var mapping = await _db.ExerciseSetMappings
            .Include(m => m.ExerciseSet)
                .ThenInclude(s => s.PatientAssignments)
            .FirstOrDefaultAsync(m => m.Id == input.MappingId, ct);

        if (mapping is null) throw new GraphQLException("Mapping not found");

        // ... apply update + SaveChangesAsync ...

        await EmitToAffectedUsersAsync(
            mapping.ExerciseSet.PatientAssignments,
            new AssignmentChangeEvent(
                AssignmentId: "",
                UserId: "",
                ChangeType: AssignmentChangeType.MappingUpdated,
                ExerciseSetId: mapping.ExerciseSetId.ToString(),
                MappingId: mapping.Id.ToString(),
                ExerciseId: mapping.ExerciseId.ToString(),
                ChangedAt: DateTime.UtcNow),
            ct);

        return mapping;
    }

    private async Task EmitToAffectedUsersAsync(
        IEnumerable<PatientAssignment> assignments,
        AssignmentChangeEvent template,
        CancellationToken ct)
    {
        // Deduplikacja per-user na wypadek wielu assignmentow tego samego usera
        var byUser = assignments.GroupBy(a => a.UserId);

        foreach (var group in byUser)
        {
            var assignment = group.First();
            var payload = template with
            {
                UserId = assignment.UserId.ToString(),
                AssignmentId = assignment.Id.ToString(),
            };

            await _eventSender.SendAsync(
                SubscriptionsRoot.TopicFor(assignment.UserId.ToString()),
                payload,
                ct);
        }
    }
}
```

### 4.3 Wzorzec dla `updateExercise` (template) - propagacja przez wiele assignmentow

```csharp
var affectedUserIds = await _db.PatientAssignments
    .Where(a => a.ExerciseSet.ExerciseMappings.Any(m => m.ExerciseId == exerciseId)
             || a.ExerciseId == exerciseId)
    .Where(a => IsCurrentStatus(a.Status))
    .Select(a => new { a.Id, a.UserId })
    .Distinct()
    .ToListAsync(ct);

foreach (var item in affectedUserIds)
{
    await _eventSender.SendAsync(
        SubscriptionsRoot.TopicFor(item.UserId.ToString()),
        new AssignmentChangeEvent(
            AssignmentId: item.Id.ToString(),
            UserId: item.UserId.ToString(),
            ChangeType: AssignmentChangeType.ExerciseTemplateUpdated,
            ExerciseSetId: null,
            MappingId: null,
            ExerciseId: exerciseId.ToString(),
            ChangedAt: DateTime.UtcNow),
        ct);
}
```

## 5. Persistence layer

Backend uzywa juz LISTEN/NOTIFY (PostgreSQL) dla istniejacych subskrypcji
admina (`OnAssignmentUpdated($organizationId)` w `assignments.subscriptions.ts`).
Nowy topic `OnMyAssignmentChanged_{userId}` wpasowuje sie w ten sam mechanizm.

Konfiguracja w `Program.cs` powinna juz miec:

```csharp
services
    .AddGraphQLServer()
    .AddSubscriptionType<SubscriptionsRoot>()
    .AddInMemorySubscriptions(); // lub Redis dla wielu instancji
```

Dla srodowiska multi-instance backend musi uzywac Redis pub/sub
(`AddRedisSubscriptions`) zeby eventy przeplywaly miedzy podami.

## 6. Backpressure / debouncing

Edycja dlugiego planu pacjenta przez admina = N eventow (np. 10x mappingUpdated).
Mozliwe strategie redukcji szumu:

1. **Backend:** dla jednego `assignmentId` w oknie 500ms wysylaj jeden zagregowany
   event `AssignmentUpdated` zamiast N. Wymaga in-memory channel z debounce.
2. **Frontend (mobile):** w `useRealtimeMyAssignments` zbieraj eventy w buffer
   (np. 300ms) i wykonaj jeden `refetchQueries`. Prostsze, mniej pracy backendu.

Rekomendacja: zacznij od podejscia frontendowego (Faza 3), backendowy debounce
dodaj jesli profilowanie pokaze problem.

## 7. Wzorzec testow integracyjnych (backend)

```csharp
[Fact]
public async Task UpdateExerciseInSet_EmitsEventToAffectedPatients()
{
    var (patientA, patientB) = await SeedTwoPatientsWithSameSetAsync();

    var topicA = SubscriptionsRoot.TopicFor(patientA.UserId.ToString());
    var topicB = SubscriptionsRoot.TopicFor(patientB.UserId.ToString());

    var streamA = await _receiver.SubscribeAsync<AssignmentChangeEvent>(topicA);
    var streamB = await _receiver.SubscribeAsync<AssignmentChangeEvent>(topicB);

    await ExecuteMutationAsync(updateExerciseInSetGql);

    var eventA = await streamA.ReadEventsAsync().FirstAsync();
    var eventB = await streamB.ReadEventsAsync().FirstAsync();

    eventA.ChangeType.Should().Be(AssignmentChangeType.MappingUpdated);
    eventB.ChangeType.Should().Be(AssignmentChangeType.MappingUpdated);
    eventA.AssignmentId.Should().Be(patientA.AssignmentId.ToString());
    eventB.AssignmentId.Should().Be(patientB.AssignmentId.ToString());
}
```

## 8. Rollout plan

1. Wdrozyc subskrypcje + emitery na staging behind feature flag
   `ENABLE_REALTIME_PATIENT_SYNC` (env var lub DB flag).
2. Mobile + admin podlaczaja sie z tym samym flag-checkiem.
3. Smoke test: edytuj override w admin, sprawdz czy mobile (drugie urzadzenie)
   odebralo event w `<2s` (logi `console.log` w `useRealtimeMyAssignments`).
4. Wlaczyc flag w prod po 24h obserwacji.
