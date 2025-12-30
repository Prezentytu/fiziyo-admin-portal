// Pełna baza kodów ICD-10 używanych w fizjoterapii
// Opracowana na podstawie klasyfikacji WHO ICD-10

export interface ICD10CodeData {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
}

// Kategorie kodów ICD-10
export const ICD10_CATEGORIES = {
  M40_M43: "Deformacje kręgosłupa",
  M45_M49: "Spondylopatie",
  M50_M54: "Inne choroby kręgosłupa",
  M60_M63: "Choroby mięśni",
  M65_M68: "Choroby błon maziowych i ścięgien",
  M70_M79: "Inne choroby tkanek miękkich",
  M15_M19: "Choroba zwyrodnieniowa stawów",
  M20_M25: "Inne choroby stawów",
  S00_S09: "Urazy głowy",
  S10_S19: "Urazy szyi",
  S20_S29: "Urazy klatki piersiowej",
  S30_S39: "Urazy brzucha i miednicy",
  S40_S49: "Urazy barku i ramienia",
  S50_S59: "Urazy łokcia i przedramienia",
  S60_S69: "Urazy nadgarstka i ręki",
  S70_S79: "Urazy biodra i uda",
  S80_S89: "Urazy kolana i podudzia",
  S90_S99: "Urazy stawu skokowego i stopy",
  G43_G44: "Migreny i bóle głowy",
  G50_G59: "Choroby nerwów",
  R25_R29: "Objawy dotyczące układu nerwowo-mięśniowego",
} as const;

// Pełna lista kodów ICD-10 dla fizjoterapii
export const ICD10_CODES: ICD10CodeData[] = [
  // ============================================
  // M40-M43: DEFORMACJE KRĘGOSŁUPA
  // ============================================
  { code: "M40.0", description: "Kifoza ułożeniowa", category: "M40_M43" },
  { code: "M40.1", description: "Inne kify wtórne", category: "M40_M43" },
  { code: "M40.2", description: "Inna i nieokreślona kifoza", category: "M40_M43" },
  { code: "M41.0", description: "Skolioza idiopatyczna niemowlęca", category: "M40_M43" },
  { code: "M41.1", description: "Skolioza idiopatyczna młodzieńcza", category: "M40_M43" },
  { code: "M41.2", description: "Inna skolioza idiopatyczna", category: "M40_M43" },
  { code: "M41.3", description: "Skolioza torakogenna", category: "M40_M43" },
  { code: "M41.4", description: "Skolioza nerwowo-mięśniowa", category: "M40_M43" },
  { code: "M41.5", description: "Inna skolioza wtórna", category: "M40_M43" },
  { code: "M42.0", description: "Młodzieńcza osteochondroza kręgosłupa", category: "M40_M43" },
  { code: "M42.1", description: "Osteochondroza kręgosłupa u dorosłych", category: "M40_M43" },
  { code: "M43.0", description: "Spondyloliza", category: "M40_M43" },
  { code: "M43.1", description: "Kręgozmyk", category: "M40_M43" },

  // ============================================
  // M45-M49: SPONDYLOPATIE
  // ============================================
  { code: "M45", description: "Zesztywniające zapalenie stawów kręgosłupa", category: "M45_M49" },
  { code: "M46.0", description: "Entezopatie kręgosłupa", category: "M45_M49" },
  { code: "M46.1", description: "Zapalenie kości i szpiku kręgosłupa", category: "M45_M49" },
  { code: "M47.1", description: "Inne spondylozy z mielopatią", category: "M45_M49" },
  { code: "M47.2", description: "Inne spondylozy z radikulopatią", category: "M45_M49" },
  { code: "M47.8", description: "Inne spondylozy", category: "M45_M49" },
  { code: "M47.9", description: "Spondyloza, nieokreślona", category: "M45_M49" },
  { code: "M48.0", description: "Zwężenie kanału kręgowego", category: "M45_M49" },
  { code: "M48.1", description: "Hyperostoza zesztywniająca (choroba Forestiera)", category: "M45_M49" },
  { code: "M48.4", description: "Złamanie zmęczeniowe kręgu", category: "M45_M49" },
  { code: "M48.5", description: "Złamanie kręgu nieokreślone jako patologiczne", category: "M45_M49" },

  // ============================================
  // M50-M54: INNE CHOROBY KRĘGOSŁUPA
  // ============================================
  { code: "M50.0", description: "Choroba krążka szyjnego z mielopatią", category: "M50_M54" },
  { code: "M50.1", description: "Choroba krążka szyjnego z radikulopatią", category: "M50_M54" },
  { code: "M50.2", description: "Inne przemieszczenie krążka szyjnego", category: "M50_M54" },
  { code: "M50.3", description: "Inna degeneracja krążka szyjnego", category: "M50_M54" },
  { code: "M51.0", description: "Choroba krążka lędźwiowego z mielopatią", category: "M50_M54" },
  { code: "M51.1", description: "Choroba krążka lędźwiowego z radikulopatią", category: "M50_M54" },
  { code: "M51.2", description: "Inne przemieszczenie krążka lędźwiowego", category: "M50_M54" },
  { code: "M51.3", description: "Inna degeneracja krążka lędźwiowego", category: "M50_M54" },
  { code: "M53.0", description: "Zespół szyjno-czaszkowy", category: "M50_M54" },
  { code: "M53.1", description: "Zespół szyjno-ramienny", category: "M50_M54" },
  { code: "M53.2", description: "Niestabilność kręgosłupa", category: "M50_M54" },
  { code: "M53.3", description: "Choroby krzyżowo-guziczne nieokreślone", category: "M50_M54" },
  { code: "M54.0", description: "Zapalenie tkanki łącznej szyi", category: "M50_M54" },
  { code: "M54.1", description: "Radikulopatia", category: "M50_M54" },
  { code: "M54.2", description: "Ból szyi (cervicalgia)", category: "M50_M54" },
  { code: "M54.3", description: "Rwa kulszowa (sciatica)", category: "M50_M54" },
  { code: "M54.4", description: "Rwa kulszowa z bólem lędźwiowym", category: "M50_M54" },
  { code: "M54.5", description: "Ból dolnego odcinka kręgosłupa (lumbago)", category: "M50_M54" },
  { code: "M54.6", description: "Ból w odcinku piersiowym kręgosłupa", category: "M50_M54" },
  { code: "M54.8", description: "Inne bóle grzbietu", category: "M50_M54" },
  { code: "M54.9", description: "Ból grzbietu, nieokreślony", category: "M50_M54" },

  // ============================================
  // M60-M63: CHOROBY MIĘŚNI
  // ============================================
  { code: "M60.0", description: "Zakaźne zapalenie mięśni", category: "M60_M63" },
  { code: "M60.1", description: "Śródmiąższowe zapalenie mięśni", category: "M60_M63" },
  { code: "M60.8", description: "Inne zapalenie mięśni", category: "M60_M63" },
  { code: "M62.0", description: "Rozejście się mięśnia", category: "M60_M63" },
  { code: "M62.1", description: "Inny ubytek mięśnia", category: "M60_M63" },
  { code: "M62.2", description: "Martwica niedokrwienna mięśnia", category: "M60_M63" },
  { code: "M62.3", description: "Zespół unieruchomienia (bezruch, przykurcz)", category: "M60_M63" },
  { code: "M62.4", description: "Przykurcz mięśnia", category: "M60_M63" },
  { code: "M62.5", description: "Zanik i zanikanie mięśni nieokreślone", category: "M60_M63" },
  { code: "M62.6", description: "Nadmierny wysiłek mięśniowy", category: "M60_M63" },
  { code: "M62.8", description: "Inne określone choroby mięśni", category: "M60_M63" },
  { code: "M63.0", description: "Zapalenie mięśni w chorobach zakaźnych", category: "M60_M63" },

  // ============================================
  // M65-M68: CHOROBY BŁON MAZIOWYCH I ŚCIĘGIEN
  // ============================================
  { code: "M65.0", description: "Ropowica pochewki ścięgna", category: "M65_M68" },
  { code: "M65.2", description: "Wapniejące zapalenie ścięgna", category: "M65_M68" },
  { code: "M65.3", description: "Palec trzaskający", category: "M65_M68" },
  { code: "M65.4", description: "Zapalenie pochewki ścięgna wyrostka rylcowatego (de Quervain)", category: "M65_M68" },
  { code: "M65.8", description: "Inne zapalenie błon maziowych i ścięgien", category: "M65_M68" },
  { code: "M66.0", description: "Pęknięcie torbieli podkolanowej", category: "M65_M68" },
  { code: "M66.2", description: "Samoistne pęknięcie ścięgien prostowników", category: "M65_M68" },
  { code: "M66.3", description: "Samoistne pęknięcie ścięgien zginaczy", category: "M65_M68" },
  { code: "M67.0", description: "Skrócenie ścięgna Achillesa", category: "M65_M68" },
  { code: "M67.4", description: "Ganglion", category: "M65_M68" },

  // ============================================
  // M70-M79: INNE CHOROBY TKANEK MIĘKKICH
  // ============================================
  { code: "M70.0", description: "Przewlekłe zapalenie kaletki maziowej (crepitant)", category: "M70_M79" },
  { code: "M70.1", description: "Zapalenie kaletki ręki", category: "M70_M79" },
  { code: "M70.2", description: "Zapalenie kaletki łokciowej", category: "M70_M79" },
  { code: "M70.3", description: "Inne zapalenie kaletki łokcia", category: "M70_M79" },
  { code: "M70.4", description: "Zapalenie kaletki przedrzepkowej", category: "M70_M79" },
  { code: "M70.5", description: "Inne zapalenie kaletki kolana", category: "M70_M79" },
  { code: "M70.6", description: "Zapalenie kaletki krętarzowej", category: "M70_M79" },
  { code: "M70.7", description: "Inne zapalenie kaletki biodra", category: "M70_M79" },
  { code: "M71.0", description: "Ropień kaletki maziowej", category: "M70_M79" },
  { code: "M71.1", description: "Inne zakaźne zapalenie kaletki", category: "M70_M79" },
  { code: "M71.3", description: "Inna torbiel kaletki maziowej", category: "M70_M79" },
  { code: "M71.5", description: "Inne zapalenie kaletki nieokreślone", category: "M70_M79" },
  { code: "M72.0", description: "Zapalenie rozcięgna dłoniowego (Dupuytren)", category: "M70_M79" },
  { code: "M72.1", description: "Guzki na palcach", category: "M70_M79" },
  { code: "M72.2", description: "Zapalenie rozcięgna podeszwowego", category: "M70_M79" },
  { code: "M72.4", description: "Przykurcz rozciągła powięzi dłoniowej", category: "M70_M79" },
  { code: "M75.0", description: "Zapalenie torebki barku (capsulitis adhesiva)", category: "M70_M79" },
  { code: "M75.1", description: "Zespół cieśni podbarkowej", category: "M70_M79" },
  { code: "M75.2", description: "Zapalenie ścięgna mięśnia nadgrzebieniowego", category: "M70_M79" },
  { code: "M75.3", description: "Wapniejące zapalenie ścięgna barku", category: "M70_M79" },
  { code: "M75.4", description: "Zespół bolesnego barku", category: "M70_M79" },
  { code: "M75.5", description: "Zapalenie kaletki barkowej", category: "M70_M79" },
  { code: "M76.0", description: "Zapalenie ścięgna pośladkowego", category: "M70_M79" },
  { code: "M76.1", description: "Zapalenie ścięgna mięśnia lędźwiowo-biodrowego", category: "M70_M79" },
  { code: "M76.2", description: "Ostroga kości biodrowej", category: "M70_M79" },
  { code: "M76.3", description: "Zespół pasma biodrowo-piszczelowego", category: "M70_M79" },
  { code: "M76.4", description: "Zapalenie kaletki piszczelowej", category: "M70_M79" },
  { code: "M76.5", description: "Zapalenie ścięgna rzepki", category: "M70_M79" },
  { code: "M76.6", description: "Zapalenie ścięgna Achillesa", category: "M70_M79" },
  { code: "M76.7", description: "Zapalenie ścięgna mięśnia strzałkowego", category: "M70_M79" },
  { code: "M77.0", description: "Łokieć tenisisty (epicondylitis lateralis)", category: "M70_M79" },
  { code: "M77.1", description: "Łokieć golfisty (epicondylitis medialis)", category: "M70_M79" },
  { code: "M77.2", description: "Zapalenie okołonadkłykciowe nadgarstka", category: "M70_M79" },
  { code: "M77.3", description: "Ostroga piętowa", category: "M70_M79" },
  { code: "M77.4", description: "Ból śródstopia (metatarsalgia)", category: "M70_M79" },
  { code: "M77.5", description: "Inne entezopatie stopy", category: "M70_M79" },
  { code: "M79.0", description: "Reumatyzm nieokreślony", category: "M70_M79" },
  { code: "M79.1", description: "Bóle mięśniowe (myalgia)", category: "M70_M79" },
  { code: "M79.2", description: "Neuralgia i zapalenie nerwu nieokreślone", category: "M70_M79" },
  { code: "M79.3", description: "Zapalenie tkanki łącznej nieokreślone", category: "M70_M79" },
  { code: "M79.4", description: "Przerost tłuszczówki na poziomie kolana", category: "M70_M79" },
  { code: "M79.5", description: "Pozostałości ciała obcego w tkankach miękkich", category: "M70_M79" },
  { code: "M79.6", description: "Ból kończyny", category: "M70_M79" },
  { code: "M79.7", description: "Fibromialgia", category: "M70_M79" },

  // ============================================
  // M15-M19: CHOROBA ZWYRODNIENIOWA STAWÓW
  // ============================================
  { code: "M15.0", description: "Pierwotna uogólniona choroba zwyrodnieniowa stawów", category: "M15_M19" },
  { code: "M15.1", description: "Guzki Heberdena (z artropatią)", category: "M15_M19" },
  { code: "M15.2", description: "Guzki Boucharda (z artropatią)", category: "M15_M19" },
  { code: "M15.3", description: "Wtórna wielostawowa choroba zwyrodnieniowa", category: "M15_M19" },
  { code: "M15.4", description: "Nadżerkowa (zanikowa) choroba zwyrodnieniowa", category: "M15_M19" },
  { code: "M16.0", description: "Pierwotna choroba zwyrodnieniowa biodra obustronna", category: "M15_M19" },
  { code: "M16.1", description: "Pierwotna choroba zwyrodnieniowa biodra jednostronna", category: "M15_M19" },
  { code: "M16.2", description: "Choroba zwyrodnieniowa biodra w dysplazji obustronnej", category: "M15_M19" },
  { code: "M16.3", description: "Choroba zwyrodnieniowa biodra w dysplazji jednostronnej", category: "M15_M19" },
  { code: "M16.4", description: "Pourazowa choroba zwyrodnieniowa biodra obustronna", category: "M15_M19" },
  { code: "M16.5", description: "Pourazowa choroba zwyrodnieniowa biodra jednostronna", category: "M15_M19" },
  { code: "M16.6", description: "Inna wtórna choroba zwyrodnieniowa biodra obustronna", category: "M15_M19" },
  { code: "M16.7", description: "Inna wtórna choroba zwyrodnieniowa biodra jednostronna", category: "M15_M19" },
  { code: "M16.9", description: "Choroba zwyrodnieniowa biodra nieokreślona", category: "M15_M19" },
  { code: "M17.0", description: "Pierwotna choroba zwyrodnieniowa kolana obustronna", category: "M15_M19" },
  { code: "M17.1", description: "Pierwotna choroba zwyrodnieniowa kolana jednostronna", category: "M15_M19" },
  { code: "M17.2", description: "Pourazowa choroba zwyrodnieniowa kolana obustronna", category: "M15_M19" },
  { code: "M17.3", description: "Pourazowa choroba zwyrodnieniowa kolana jednostronna", category: "M15_M19" },
  { code: "M17.4", description: "Inna wtórna choroba zwyrodnieniowa kolana obustronna", category: "M15_M19" },
  { code: "M17.5", description: "Inna wtórna choroba zwyrodnieniowa kolana jednostronna", category: "M15_M19" },
  { code: "M17.9", description: "Choroba zwyrodnieniowa kolana nieokreślona", category: "M15_M19" },
  {
    code: "M18.0",
    description: "Pierwotna choroba zwyrodnieniowa stawu nadgarstkowo-śródręcznego obustronna",
    category: "M15_M19",
  },
  {
    code: "M18.1",
    description: "Pierwotna choroba zwyrodnieniowa stawu nadgarstkowo-śródręcznego jednostronna",
    category: "M15_M19",
  },
  {
    code: "M18.9",
    description: "Choroba zwyrodnieniowa stawu nadgarstkowo-śródręcznego nieokreślona",
    category: "M15_M19",
  },
  { code: "M19.0", description: "Pierwotna choroba zwyrodnieniowa innych stawów", category: "M15_M19" },
  { code: "M19.1", description: "Pourazowa choroba zwyrodnieniowa innych stawów", category: "M15_M19" },
  { code: "M19.2", description: "Wtórna choroba zwyrodnieniowa innych stawów", category: "M15_M19" },
  { code: "M19.9", description: "Choroba zwyrodnieniowa nieokreślona", category: "M15_M19" },

  // ============================================
  // M20-M25: INNE CHOROBY STAWÓW
  // ============================================
  { code: "M20.0", description: "Zniekształcenie palców", category: "M20_M25" },
  { code: "M20.1", description: "Paluch koślawy (hallux valgus)", category: "M20_M25" },
  { code: "M20.2", description: "Paluch sztywny (hallux rigidus)", category: "M20_M25" },
  { code: "M20.3", description: "Inne zniekształcenia palucha", category: "M20_M25" },
  { code: "M20.4", description: "Palec młotkowaty", category: "M20_M25" },
  { code: "M21.0", description: "Koślawość nie sklasyfikowana gdzie indziej", category: "M20_M25" },
  { code: "M21.1", description: "Szpotawość nie sklasyfikowana gdzie indziej", category: "M20_M25" },
  { code: "M21.2", description: "Zniekształcenie zgięciowe", category: "M20_M25" },
  { code: "M21.3", description: "Zwisanie stopy lub ręki", category: "M20_M25" },
  { code: "M21.4", description: "Stopa płaska (pes planus)", category: "M20_M25" },
  { code: "M21.5", description: "Inna nabyta deformacja stopy", category: "M20_M25" },
  { code: "M21.6", description: "Inne nabyte deformacje stawu skokowego i stopy", category: "M20_M25" },
  { code: "M22.0", description: "Nawykowe zwichnięcie rzepki", category: "M20_M25" },
  { code: "M22.1", description: "Podwichnięcie rzepki", category: "M20_M25" },
  { code: "M22.2", description: "Zaburzenia rzepkowo-udowe", category: "M20_M25" },
  { code: "M22.3", description: "Inne zaburzenia rzepki", category: "M20_M25" },
  { code: "M22.4", description: "Chondromalacja rzepki", category: "M20_M25" },
  { code: "M23.0", description: "Torbiel łąkotki", category: "M20_M25" },
  { code: "M23.2", description: "Uszkodzenie łąkotki z przyczyn starych", category: "M20_M25" },
  { code: "M23.3", description: "Inne uszkodzenia łąkotki", category: "M20_M25" },
  { code: "M23.4", description: "Ciało wolne w stawie kolanowym", category: "M20_M25" },
  { code: "M23.5", description: "Przewlekła niestabilność kolana", category: "M20_M25" },
  { code: "M23.6", description: "Inne samoistne rozerwania więzadeł kolana", category: "M20_M25" },
  { code: "M24.0", description: "Ciało wolne w stawie", category: "M20_M25" },
  { code: "M24.1", description: "Inne zaburzenia chrząstki stawowej", category: "M20_M25" },
  { code: "M24.2", description: "Zaburzenie więzadła", category: "M20_M25" },
  { code: "M24.3", description: "Patologiczne zwichnięcie i podwichnięcie stawu", category: "M20_M25" },
  { code: "M24.4", description: "Nawrotowe zwichnięcie i podwichnięcie stawu", category: "M20_M25" },
  { code: "M24.5", description: "Przykurcz stawu", category: "M20_M25" },
  { code: "M24.6", description: "Ankyloza stawu", category: "M20_M25" },
  { code: "M25.0", description: "Wylew krwawy do stawu", category: "M20_M25" },
  { code: "M25.1", description: "Przetoka stawu", category: "M20_M25" },
  { code: "M25.2", description: "Staw cepowaty", category: "M20_M25" },
  { code: "M25.3", description: "Niestabilność stawu", category: "M20_M25" },
  { code: "M25.4", description: "Wysięk stawowy", category: "M20_M25" },
  { code: "M25.5", description: "Ból stawu (artralgia)", category: "M20_M25" },
  { code: "M25.6", description: "Sztywność stawu nie sklasyfikowana gdzie indziej", category: "M20_M25" },
  { code: "M25.7", description: "Osteofity", category: "M20_M25" },

  // ============================================
  // S40-S49: URAZY BARKU I RAMIENIA
  // ============================================
  { code: "S40.0", description: "Stłuczenie barku", category: "S40_S49" },
  { code: "S40.7", description: "Liczne powierzchowne urazy barku i ramienia", category: "S40_S49" },
  { code: "S42.0", description: "Złamanie obojczyka", category: "S40_S49" },
  { code: "S42.1", description: "Złamanie łopatki", category: "S40_S49" },
  { code: "S42.2", description: "Złamanie nasady bliższej kości ramiennej", category: "S40_S49" },
  { code: "S42.3", description: "Złamanie trzonu kości ramiennej", category: "S40_S49" },
  { code: "S42.4", description: "Złamanie nasady dalszej kości ramiennej", category: "S40_S49" },
  { code: "S43.0", description: "Zwichnięcie stawu barkowego", category: "S40_S49" },
  { code: "S43.1", description: "Zwichnięcie stawu barkowo-obojczykowego", category: "S40_S49" },
  { code: "S43.2", description: "Zwichnięcie stawu mostkowo-obojczykowego", category: "S40_S49" },
  { code: "S43.3", description: "Zwichnięcie innej części obręczy barkowej", category: "S40_S49" },
  { code: "S43.4", description: "Skręcenie i naderwanie stawu barkowego", category: "S40_S49" },
  { code: "S43.5", description: "Skręcenie i naderwanie stawu barkowo-obojczykowego", category: "S40_S49" },
  { code: "S43.7", description: "Skręcenie obręczy barkowej nieokreślone", category: "S40_S49" },
  { code: "S46.0", description: "Uraz ścięgna stożka rotatorów", category: "S40_S49" },
  { code: "S46.1", description: "Uraz mięśnia i ścięgna długiej głowy mięśnia dwugłowego", category: "S40_S49" },
  { code: "S46.2", description: "Uraz mięśnia i ścięgna części ramiennej mięśnia dwugłowego", category: "S40_S49" },
  { code: "S46.3", description: "Uraz mięśnia i ścięgna mięśnia trójgłowego", category: "S40_S49" },

  // ============================================
  // S50-S59: URAZY ŁOKCIA I PRZEDRAMIENIA
  // ============================================
  { code: "S50.0", description: "Stłuczenie łokcia", category: "S50_S59" },
  { code: "S50.1", description: "Stłuczenie innej części przedramienia", category: "S50_S59" },
  { code: "S52.0", description: "Złamanie nasady bliższej kości łokciowej", category: "S50_S59" },
  { code: "S52.1", description: "Złamanie nasady bliższej kości promieniowej", category: "S50_S59" },
  { code: "S52.2", description: "Złamanie trzonu kości łokciowej", category: "S50_S59" },
  { code: "S52.3", description: "Złamanie trzonu kości promieniowej", category: "S50_S59" },
  { code: "S52.5", description: "Złamanie nasady dalszej kości promieniowej", category: "S50_S59" },
  { code: "S53.0", description: "Zwichnięcie głowy kości promieniowej", category: "S50_S59" },
  { code: "S53.1", description: "Zwichnięcie stawu łokciowego", category: "S50_S59" },
  { code: "S53.4", description: "Skręcenie i naderwanie stawu łokciowego", category: "S50_S59" },
  { code: "S56.0", description: "Uraz mięśnia zginacza i ścięgna kciuka", category: "S50_S59" },
  { code: "S56.1", description: "Uraz długiego zginacza i ścięgna innego palca", category: "S50_S59" },

  // ============================================
  // S60-S69: URAZY NADGARSTKA I RĘKI
  // ============================================
  { code: "S60.0", description: "Stłuczenie palca bez uszkodzenia paznokcia", category: "S60_S69" },
  { code: "S60.2", description: "Stłuczenie innej części nadgarstka i ręki", category: "S60_S69" },
  { code: "S62.0", description: "Złamanie kości łódkowatej ręki", category: "S60_S69" },
  { code: "S62.1", description: "Złamanie innej kości nadgarstka", category: "S60_S69" },
  { code: "S62.2", description: "Złamanie pierwszej kości śródręcza", category: "S60_S69" },
  { code: "S62.3", description: "Złamanie innej kości śródręcza", category: "S60_S69" },
  { code: "S62.5", description: "Złamanie kciuka", category: "S60_S69" },
  { code: "S62.6", description: "Złamanie innego palca", category: "S60_S69" },
  { code: "S63.0", description: "Zwichnięcie nadgarstka", category: "S60_S69" },
  { code: "S63.1", description: "Zwichnięcie palca", category: "S60_S69" },
  { code: "S63.3", description: "Urazowe pęknięcie więzadła nadgarstka", category: "S60_S69" },
  { code: "S63.4", description: "Urazowe pęknięcie więzadła palca", category: "S60_S69" },
  { code: "S63.5", description: "Skręcenie i naderwanie nadgarstka", category: "S60_S69" },
  { code: "S63.6", description: "Skręcenie i naderwanie palca", category: "S60_S69" },
  { code: "S66.0", description: "Uraz długiego zginacza kciuka i jego ścięgna", category: "S60_S69" },
  { code: "S66.1", description: "Uraz zginacza i ścięgna innego palca", category: "S60_S69" },
  { code: "S66.2", description: "Uraz prostownika i ścięgna kciuka", category: "S60_S69" },
  { code: "S66.3", description: "Uraz prostownika i ścięgna innego palca", category: "S60_S69" },

  // ============================================
  // S70-S79: URAZY BIODRA I UDA
  // ============================================
  { code: "S70.0", description: "Stłuczenie biodra", category: "S70_S79" },
  { code: "S70.1", description: "Stłuczenie uda", category: "S70_S79" },
  { code: "S72.0", description: "Złamanie szyjki kości udowej", category: "S70_S79" },
  { code: "S72.1", description: "Złamanie przezkrętarzowe", category: "S70_S79" },
  { code: "S72.2", description: "Złamanie podkrętarzowe", category: "S70_S79" },
  { code: "S72.3", description: "Złamanie trzonu kości udowej", category: "S70_S79" },
  { code: "S72.4", description: "Złamanie nasady dalszej kości udowej", category: "S70_S79" },
  { code: "S73.0", description: "Zwichnięcie biodra", category: "S70_S79" },
  { code: "S73.1", description: "Skręcenie i naderwanie biodra", category: "S70_S79" },
  { code: "S76.0", description: "Uraz mięśnia i ścięgna biodra", category: "S70_S79" },
  { code: "S76.1", description: "Uraz mięśnia i ścięgna czworogłowego uda", category: "S70_S79" },
  { code: "S76.2", description: "Uraz mięśnia i ścięgna przywodzicieli uda", category: "S70_S79" },
  { code: "S76.3", description: "Uraz mięśni i ścięgien tylnej grupy uda", category: "S70_S79" },
  { code: "S76.4", description: "Uraz innych mięśni i ścięgien uda", category: "S70_S79" },

  // ============================================
  // S80-S89: URAZY KOLANA I PODUDZIA
  // ============================================
  { code: "S80.0", description: "Stłuczenie kolana", category: "S80_S89" },
  { code: "S80.1", description: "Stłuczenie innej części podudzia", category: "S80_S89" },
  { code: "S82.0", description: "Złamanie rzepki", category: "S80_S89" },
  { code: "S82.1", description: "Złamanie nasady bliższej kości piszczelowej", category: "S80_S89" },
  { code: "S82.2", description: "Złamanie trzonu kości piszczelowej", category: "S80_S89" },
  { code: "S82.3", description: "Złamanie nasady dalszej kości piszczelowej", category: "S80_S89" },
  { code: "S82.4", description: "Złamanie kości strzałkowej", category: "S80_S89" },
  { code: "S82.5", description: "Złamanie kostki przyśrodkowej", category: "S80_S89" },
  { code: "S82.6", description: "Złamanie kostki bocznej", category: "S80_S89" },
  { code: "S82.7", description: "Złamanie mnogie podudzia", category: "S80_S89" },
  { code: "S82.8", description: "Złamanie innych części podudzia", category: "S80_S89" },
  { code: "S83.0", description: "Zwichnięcie rzepki", category: "S80_S89" },
  { code: "S83.1", description: "Zwichnięcie stawu kolanowego", category: "S80_S89" },
  { code: "S83.2", description: "Świeże rozerwanie łąkotki", category: "S80_S89" },
  { code: "S83.3", description: "Świeże rozerwanie chrząstki stawowej kolana", category: "S80_S89" },
  { code: "S83.4", description: "Skręcenie i naderwanie więzadła pobocznego przyśrodkowego", category: "S80_S89" },
  { code: "S83.5", description: "Skręcenie i naderwanie więzadła pobocznego bocznego", category: "S80_S89" },
  { code: "S83.6", description: "Skręcenie i naderwanie więzadła krzyżowego przedniego", category: "S80_S89" },
  { code: "S83.7", description: "Skręcenie i naderwanie więzadła krzyżowego tylnego", category: "S80_S89" },
  { code: "S86.0", description: "Uraz ścięgna Achillesa", category: "S80_S89" },
  { code: "S86.1", description: "Uraz innych mięśni i ścięgien grupy tylnej podudzia", category: "S80_S89" },
  { code: "S86.2", description: "Uraz mięśni i ścięgien grupy przedniej podudzia", category: "S80_S89" },
  { code: "S86.3", description: "Uraz mięśni i ścięgien mięśnia strzałkowego", category: "S80_S89" },

  // ============================================
  // S90-S99: URAZY STAWU SKOKOWEGO I STOPY
  // ============================================
  { code: "S90.0", description: "Stłuczenie stawu skokowego", category: "S90_S99" },
  { code: "S90.1", description: "Stłuczenie palca stopy", category: "S90_S99" },
  { code: "S90.3", description: "Stłuczenie innej części stopy", category: "S90_S99" },
  { code: "S92.0", description: "Złamanie kości piętowej", category: "S90_S99" },
  { code: "S92.1", description: "Złamanie kości skokowej", category: "S90_S99" },
  { code: "S92.2", description: "Złamanie innych kości stępu", category: "S90_S99" },
  { code: "S92.3", description: "Złamanie kości śródstopia", category: "S90_S99" },
  { code: "S92.4", description: "Złamanie palucha", category: "S90_S99" },
  { code: "S92.5", description: "Złamanie innego palca stopy", category: "S90_S99" },
  { code: "S93.0", description: "Zwichnięcie stawu skokowego", category: "S90_S99" },
  { code: "S93.1", description: "Zwichnięcie palca stopy", category: "S90_S99" },
  { code: "S93.2", description: "Rozerwanie więzadeł stawu skokowego i stopy", category: "S90_S99" },
  { code: "S93.4", description: "Skręcenie i naderwanie stawu skokowego", category: "S90_S99" },
  { code: "S93.5", description: "Skręcenie i naderwanie palca stopy", category: "S90_S99" },
  { code: "S96.0", description: "Uraz mięśnia i ścięgna długiego zginacza palucha", category: "S90_S99" },
  { code: "S96.1", description: "Uraz mięśnia i ścięgna długiego prostownika palucha", category: "S90_S99" },
  { code: "S96.2", description: "Uraz mięśni i ścięgien wewnętrznych stopy", category: "S90_S99" },

  // ============================================
  // S10-S19: URAZY SZYI
  // ============================================
  { code: "S10.0", description: "Stłuczenie gardła", category: "S10_S19" },
  { code: "S10.1", description: "Inne powierzchowne urazy szyi", category: "S10_S19" },
  { code: "S12.0", description: "Złamanie pierwszego kręgu szyjnego", category: "S10_S19" },
  { code: "S12.1", description: "Złamanie drugiego kręgu szyjnego", category: "S10_S19" },
  { code: "S12.2", description: "Złamanie innego określonego kręgu szyjnego", category: "S10_S19" },
  { code: "S13.0", description: "Urazowe pęknięcie krążka szyjnego", category: "S10_S19" },
  { code: "S13.1", description: "Zwichnięcie kręgu szyjnego", category: "S10_S19" },
  { code: "S13.4", description: "Skręcenie i naderwanie kręgosłupa szyjnego (whiplash)", category: "S10_S19" },
  { code: "S14.0", description: "Wstrząśnienie i obrzęk rdzenia szyjnego", category: "S10_S19" },
  { code: "S14.3", description: "Uraz splotu ramiennego", category: "S10_S19" },
  { code: "S16", description: "Uraz mięśni i ścięgien szyi", category: "S10_S19" },

  // ============================================
  // S20-S29: URAZY KLATKI PIERSIOWEJ
  // ============================================
  { code: "S20.2", description: "Stłuczenie klatki piersiowej", category: "S20_S29" },
  { code: "S22.0", description: "Złamanie kręgu piersiowego", category: "S20_S29" },
  { code: "S22.2", description: "Złamanie mostka", category: "S20_S29" },
  { code: "S22.3", description: "Złamanie żebra", category: "S20_S29" },
  { code: "S22.4", description: "Złamanie mnogie żeber", category: "S20_S29" },
  { code: "S23.0", description: "Urazowe pęknięcie krążka piersiowego", category: "S20_S29" },
  { code: "S23.1", description: "Zwichnięcie kręgu piersiowego", category: "S20_S29" },
  { code: "S23.3", description: "Skręcenie kręgosłupa piersiowego", category: "S20_S29" },
  { code: "S29.0", description: "Uraz mięśni i ścięgien klatki piersiowej", category: "S20_S29" },

  // ============================================
  // S30-S39: URAZY BRZUCHA I MIEDNICY
  // ============================================
  { code: "S30.0", description: "Stłuczenie dolnej części grzbietu i miednicy", category: "S30_S39" },
  { code: "S32.0", description: "Złamanie kręgu lędźwiowego", category: "S30_S39" },
  { code: "S32.1", description: "Złamanie kości krzyżowej", category: "S30_S39" },
  { code: "S32.2", description: "Złamanie kości guzicznej", category: "S30_S39" },
  { code: "S32.3", description: "Złamanie kości biodrowej", category: "S30_S39" },
  { code: "S32.4", description: "Złamanie panewki", category: "S30_S39" },
  { code: "S32.5", description: "Złamanie kości łonowej", category: "S30_S39" },
  { code: "S33.0", description: "Urazowe pęknięcie krążka lędźwiowego", category: "S30_S39" },
  { code: "S33.1", description: "Zwichnięcie kręgu lędźwiowego", category: "S30_S39" },
  { code: "S33.2", description: "Zwichnięcie stawu krzyżowo-biodrowego", category: "S30_S39" },
  { code: "S33.5", description: "Skręcenie kręgosłupa lędźwiowego", category: "S30_S39" },
  { code: "S33.6", description: "Skręcenie stawu krzyżowo-biodrowego", category: "S30_S39" },
  { code: "S39.0", description: "Uraz mięśni i ścięgien brzucha, grzbietu i miednicy", category: "S30_S39" },

  // ============================================
  // G43-G44: MIGRENY I BÓLE GŁOWY
  // ============================================
  { code: "G43.0", description: "Migrena bez aury (migrena zwykła)", category: "G43_G44" },
  { code: "G43.1", description: "Migrena z aurą (migrena klasyczna)", category: "G43_G44" },
  { code: "G43.2", description: "Stan migrenowy", category: "G43_G44" },
  { code: "G43.3", description: "Migrena powikłana", category: "G43_G44" },
  { code: "G43.8", description: "Inna migrena", category: "G43_G44" },
  { code: "G43.9", description: "Migrena nieokreślona", category: "G43_G44" },
  { code: "G44.0", description: "Zespół bólów głowy typu klasterowego", category: "G43_G44" },
  { code: "G44.1", description: "Naczyniowy ból głowy nie sklasyfikowany", category: "G43_G44" },
  { code: "G44.2", description: "Ból głowy typu napięciowego", category: "G43_G44" },
  { code: "G44.3", description: "Przewlekły pourazowy ból głowy", category: "G43_G44" },
  { code: "G44.4", description: "Ból głowy polekowy", category: "G43_G44" },
  { code: "G44.8", description: "Inne określone zespoły bólów głowy", category: "G43_G44" },

  // ============================================
  // G50-G59: CHOROBY NERWÓW
  // ============================================
  { code: "G50.0", description: "Neuralgia nerwu trójdzielnego", category: "G50_G59" },
  { code: "G50.1", description: "Atypowy ból twarzy", category: "G50_G59" },
  { code: "G51.0", description: "Porażenie Bella (porażenie nerwu twarzowego)", category: "G50_G59" },
  { code: "G54.0", description: "Zaburzenia splotu ramiennego", category: "G50_G59" },
  { code: "G54.1", description: "Zaburzenia splotu lędźwiowo-krzyżowego", category: "G50_G59" },
  { code: "G54.2", description: "Zaburzenia korzeni szyjnych", category: "G50_G59" },
  { code: "G54.3", description: "Zaburzenia korzeni piersiowych", category: "G50_G59" },
  { code: "G54.4", description: "Zaburzenia korzeni lędźwiowo-krzyżowych", category: "G50_G59" },
  { code: "G56.0", description: "Zespół cieśni nadgarstka", category: "G50_G59" },
  { code: "G56.1", description: "Inne uszkodzenie nerwu pośrodkowego", category: "G50_G59" },
  { code: "G56.2", description: "Uszkodzenie nerwu łokciowego", category: "G50_G59" },
  { code: "G56.3", description: "Uszkodzenie nerwu promieniowego", category: "G50_G59" },
  { code: "G57.0", description: "Uszkodzenie nerwu kulszowego", category: "G50_G59" },
  { code: "G57.1", description: "Rwa udowa (meralgia paraesthetica)", category: "G50_G59" },
  { code: "G57.2", description: "Uszkodzenie nerwu udowego", category: "G50_G59" },
  { code: "G57.3", description: "Uszkodzenie nerwu strzałkowego bocznego", category: "G50_G59" },
  { code: "G57.4", description: "Uszkodzenie nerwu strzałkowego przyśrodkowego", category: "G50_G59" },
  { code: "G57.5", description: "Zespół kanału stępu", category: "G50_G59" },
  { code: "G57.6", description: "Uszkodzenie nerwów podeszwowych", category: "G50_G59" },
  { code: "G58.0", description: "Neuropatia międzyżebrowa", category: "G50_G59" },
  { code: "G58.7", description: "Mononeuritis multiplex", category: "G50_G59" },

  // ============================================
  // R25-R29: OBJAWY UKŁADU NERWOWO-MIĘŚNIOWEGO
  // ============================================
  { code: "R25.0", description: "Nieprawidłowe ruchy głowy", category: "R25_R29" },
  { code: "R25.1", description: "Drżenie nieokreślone", category: "R25_R29" },
  { code: "R25.2", description: "Kurcze i skurcze", category: "R25_R29" },
  { code: "R25.3", description: "Drżenie pęczkowe", category: "R25_R29" },
  { code: "R26.0", description: "Chód ataktyczny", category: "R25_R29" },
  { code: "R26.1", description: "Chód paralityczny", category: "R25_R29" },
  { code: "R26.2", description: "Trudności w chodzeniu nie sklasyfikowane", category: "R25_R29" },
  { code: "R26.8", description: "Inne nieprawidłowości chodu i ruchomości", category: "R25_R29" },
  { code: "R27.0", description: "Ataksja nieokreślona", category: "R25_R29" },
  { code: "R27.8", description: "Inna i nieokreślona niezborność ruchowa", category: "R25_R29" },
  { code: "R29.0", description: "Tężyczka", category: "R25_R29" },
  { code: "R29.1", description: "Oponowe objawy podrażnieniowe", category: "R25_R29" },
  { code: "R29.2", description: "Nieprawidłowy odruch", category: "R25_R29" },
  { code: "R29.3", description: "Nieprawidłowa postawa", category: "R25_R29" },
  { code: "R29.4", description: "Klikające biodro", category: "R25_R29" },
  { code: "R29.6", description: "Skłonność do upadków nie sklasyfikowana", category: "R25_R29" },
  { code: "R29.8", description: "Inne objawy układu nerwowo-mięśniowego", category: "R25_R29" },

  // ============================================
  // DODATKOWE KODY WAŻNE DLA FIZJOTERAPII
  // ============================================
  {
    code: "Z96.6",
    description: "Obecność ortopedycznych implantów stawowych",
    category: "M15_M19",
    subcategory: "Stany po",
  },
  {
    code: "Z87.3",
    description: "Osobisty wywiad chorób układu mięśniowo-szkieletowego",
    category: "M15_M19",
    subcategory: "Wywiad",
  },
  { code: "Z96.64", description: "Obecność endoprotezy kolana", category: "M15_M19", subcategory: "Stany po" },
  { code: "Z96.65", description: "Obecność endoprotezy biodra", category: "M15_M19", subcategory: "Stany po" },
  {
    code: "T84.0",
    description: "Powikłanie mechaniczne wewnętrznej protezy stawowej",
    category: "M15_M19",
    subcategory: "Powikłania",
  },
  { code: "M96.1", description: "Zespół po laminektomii", category: "M50_M54", subcategory: "Stany po" },
  {
    code: "M96.6",
    description: "Złamanie kości po wszczepieniu implantu",
    category: "M15_M19",
    subcategory: "Powikłania",
  },
  { code: "G80.0", description: "Spastyczne porażenie mózgowe", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G81.0", description: "Porażenie połowicze wiotkie", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G81.1", description: "Porażenie połowicze spastyczne", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G82.1", description: "Paraplegia spastyczna", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G82.2", description: "Paraplegia nieokreślona", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G83.0", description: "Porażenie obu kończyn górnych", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G83.1", description: "Porażenie jednej kończyny dolnej", category: "G50_G59", subcategory: "Neurologia" },
  { code: "G83.2", description: "Porażenie jednej kończyny górnej", category: "G50_G59", subcategory: "Neurologia" },
  { code: "I63", description: "Zawał mózgu (udar niedokrwienny)", category: "G50_G59", subcategory: "Neurologia" },
  { code: "I69.3", description: "Następstwa zawału mózgu", category: "G50_G59", subcategory: "Neurologia" },
];

// Funkcja pomocnicza do wyszukiwania kodów
export function searchICD10Codes(query: string, limit = 20): ICD10CodeData[] {
  const lowerQuery = query.toLowerCase();
  return ICD10_CODES.filter(
    (code) => code.code.toLowerCase().includes(lowerQuery) || code.description.toLowerCase().includes(lowerQuery)
  ).slice(0, limit);
}

// Funkcja do pobrania kodów według kategorii
export function getICD10CodesByCategory(category: keyof typeof ICD10_CATEGORIES): ICD10CodeData[] {
  return ICD10_CODES.filter((code) => code.category === category);
}

// Popularne kody (najczęściej używane w fizjoterapii)
export const POPULAR_ICD10_CODES = [
  "M54.5", // Ból dolnego odcinka kręgosłupa
  "M54.2", // Ból szyi
  "M54.3", // Rwa kulszowa
  "M54.4", // Rwa kulszowa z bólem lędźwiowym
  "M75.1", // Zespół cieśni podbarkowej
  "M75.0", // Zapalenie torebki barku
  "M17.1", // Choroba zwyrodnieniowa kolana
  "M16.1", // Choroba zwyrodnieniowa biodra
  "M25.5", // Ból stawu
  "M79.1", // Bóle mięśniowe
  "S83.6", // ACL
  "S83.4", // MCL
  "S83.2", // Rozerwanie łąkotki
  "M77.0", // Łokieć tenisisty
  "M77.1", // Łokieć golfisty
  "G56.0", // Zespół cieśni nadgarstka
  "S93.4", // Skręcenie stawu skokowego
  "M51.1", // Choroba krążka z radikulopatią
  "G44.2", // Ból głowy napięciowy
  "S13.4", // Whiplash
];
