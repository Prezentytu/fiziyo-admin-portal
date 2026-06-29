# Token mapping (UI Guardian)

Mapowanie dla migracji z klas bazowych na semantyczne tokeny FiziYo.

| Legacy pattern                                       | Preferowany token                             | Uwagi                            |
| ---------------------------------------------------- | --------------------------------------------- | -------------------------------- |
| `bg-white`                                           | `bg-card` lub `bg-surface`                    | Kontenery i karty                |
| `text-black`                                         | `text-foreground`                             | Tekst bazowy                     |
| `text-gray-*` / `text-slate-*` / `text-zinc-*`       | `text-muted-foreground` lub `text-foreground` | Wybierz wg hierarchii treści     |
| `border-gray-*` / `border-slate-*` / `border-zinc-*` | `border-border`                               | Granice komponentów              |
| `bg-gray-*` / `bg-slate-*` / `bg-zinc-*`             | `bg-surface` / `bg-muted`                     | Tła sekcji i stanów              |
| `bg-black/..` overlay                                | `bg-background/90 dark:bg-black/40`           | Overlay media i floating actions |
| `text-white` na CTA                                  | `text-primary-foreground`                     | Dla akcji głównej                |

## Strategy notes

- Najpierw migruj tokeny kontenerów i typografii, potem stany hover/focus.
- Nie zmieniaj semantyki statusów (success/warning/error) bez decyzji produktowej.
- Jeżeli wzorzec nie ma 1:1 mapowania, dodaj wariant lokalny oparty o tokeny semantyczne.
