// Pełna baza kodów ICF (International Classification of Functioning, Disability and Health)
// Opracowana na podstawie klasyfikacji WHO ICF
// Kody najczęściej używane w fizjoterapii

export type ICFCategory = 
  | 'bodyFunction'    // Funkcje ciała (b)
  | 'bodyStructure'   // Struktury ciała (s)
  | 'activity'        // Aktywność (d)
  | 'participation'   // Uczestnictwo (d)
  | 'environment';    // Czynniki środowiskowe (e)

export interface ICFCodeData {
  code: string;
  description: string;
  category: ICFCategory;
  subcategory?: string;
}

// Podkategorie dla funkcji ciała
export const ICF_SUBCATEGORIES = {
  b1: 'Funkcje umysłowe',
  b2: 'Funkcje sensoryczne i ból',
  b4: 'Funkcje układu krążenia i oddechowego',
  b5: 'Funkcje układu pokarmowego',
  b6: 'Funkcje układu moczowo-płciowego',
  b7: 'Funkcje nerwowo-mięśniowo-szkieletowe',
  b8: 'Funkcje skóry',
  s1: 'Struktury układu nerwowego',
  s7: 'Struktury związane z ruchem',
  d1: 'Uczenie się i stosowanie wiedzy',
  d2: 'Zadania i wymagania ogólne',
  d3: 'Komunikowanie się',
  d4: 'Poruszanie się',
  d5: 'Samoobsługa',
  d6: 'Życie domowe',
  d7: 'Interakcje międzyludzkie',
  d8: 'Główne dziedziny życia',
  d9: 'Życie społeczne i obywatelskie',
  e1: 'Produkty i technologia',
  e3: 'Wsparcie i relacje',
  e5: 'Usługi, systemy i polityki',
} as const;

// Pełna lista kodów ICF dla fizjoterapii
export const ICF_CODES: ICFCodeData[] = [
  // ============================================
  // b7: FUNKCJE NERWOWO-MIĘŚNIOWO-SZKIELETOWE
  // (Najważniejsze dla fizjoterapii)
  // ============================================
  
  // b710-b729: Funkcje stawów i kości
  { code: 'b7100', description: 'Ruchomość pojedynczego stawu', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7101', description: 'Ruchomość kilku stawów', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7102', description: 'Ruchomość stawów uogólniona', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7108', description: 'Ruchomość stawu, inna określona', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7109', description: 'Ruchomość stawu, nieokreślona', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7150', description: 'Stabilność pojedynczego stawu', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7151', description: 'Stabilność kilku stawów', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7152', description: 'Stabilność stawów uogólniona', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7200', description: 'Ruchomość łopatki', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7201', description: 'Ruchomość miednicy', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7202', description: 'Ruchomość kości nadgarstka', category: 'bodyFunction', subcategory: 'b7' },
  
  // b730-b749: Funkcje mięśni
  { code: 'b7300', description: 'Siła izolowanych mięśni i grup mięśniowych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7301', description: 'Siła mięśni jednej kończyny', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7302', description: 'Siła mięśni jednej strony ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7303', description: 'Siła mięśni dolnej połowy ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7304', description: 'Siła mięśni wszystkich kończyn', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7305', description: 'Siła mięśni tułowia', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7306', description: 'Siła wszystkich mięśni ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7350', description: 'Napięcie izolowanych mięśni i grup mięśniowych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7351', description: 'Napięcie mięśni jednej kończyny', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7352', description: 'Napięcie mięśni jednej strony ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7353', description: 'Napięcie mięśni dolnej połowy ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7354', description: 'Napięcie mięśni wszystkich kończyn', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7355', description: 'Napięcie mięśni tułowia', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7356', description: 'Napięcie wszystkich mięśni ciała', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7400', description: 'Wytrzymałość izolowanych mięśni', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7401', description: 'Wytrzymałość grup mięśniowych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7402', description: 'Wytrzymałość wszystkich mięśni ciała', category: 'bodyFunction', subcategory: 'b7' },
  
  // b750-b789: Funkcje ruchowe
  { code: 'b7500', description: 'Odruch rozciągowy', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7501', description: 'Odruchy wywołane ruchem', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7550', description: 'Reakcje motoryczne mimowolne', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7600', description: 'Kontrola prostych ruchów dowolnych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7601', description: 'Kontrola złożonych ruchów dowolnych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7602', description: 'Koordynacja ruchów dowolnych', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7603', description: 'Funkcje wspierające ręki dominującej', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7650', description: 'Ruchy mimowolne', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7651', description: 'Drżenie', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7652', description: 'Tiki i manieryzmy', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7700', description: 'Wzorzec chodu', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7800', description: 'Czucie sztywności mięśniowej', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7801', description: 'Czucie skurczu mięśniowego', category: 'bodyFunction', subcategory: 'b7' },
  { code: 'b7802', description: 'Czucie ciężkości mięśni', category: 'bodyFunction', subcategory: 'b7' },

  // ============================================
  // b2: FUNKCJE SENSORYCZNE I BÓL
  // (Bardzo ważne dla fizjoterapii)
  // ============================================
  { code: 'b2700', description: 'Wrażliwość na ucisk', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2701', description: 'Wrażliwość na temperaturę', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2702', description: 'Wrażliwość na wibracje', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2703', description: 'Wrażliwość na bodźce uszkadzające', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2800', description: 'Ból uogólniony', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2801', description: 'Ból w części ciała', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28010', description: 'Ból głowy', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28011', description: 'Ból w klatce piersiowej', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28012', description: 'Ból brzucha', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28013', description: 'Ból pleców', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28014', description: 'Ból kończyny górnej', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28015', description: 'Ból kończyny dolnej', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b28016', description: 'Ból stawów', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2802', description: 'Ból wielomiejscowy', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2803', description: 'Ból promieniujący w dermatomie', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2804', description: 'Ból promieniujący w kończynie', category: 'bodyFunction', subcategory: 'b2' },

  // Propriocepcja
  { code: 'b2600', description: 'Czucie ułożenia ciała', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2601', description: 'Czucie ruchu ciała', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2602', description: 'Czucie szybkości ruchu', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2603', description: 'Czucie siły ruchu', category: 'bodyFunction', subcategory: 'b2' },

  // Równowaga
  { code: 'b2351', description: 'Funkcje przedsionkowe - równowaga ciała', category: 'bodyFunction', subcategory: 'b2' },
  { code: 'b2352', description: 'Funkcje przedsionkowe - kontrola posturalna', category: 'bodyFunction', subcategory: 'b2' },

  // ============================================
  // b4: FUNKCJE UKŁADU KRĄŻENIA I ODDECHOWEGO
  // ============================================
  { code: 'b4100', description: 'Częstość akcji serca', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4101', description: 'Rytm serca', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4102', description: 'Siła skurczu serca', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4150', description: 'Funkcje tętnic', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4200', description: 'Ciśnienie tętnicze wzrastające', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4201', description: 'Ciśnienie tętnicze malejące', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4202', description: 'Utrzymywanie ciśnienia tętniczego', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4300', description: 'Częstość oddychania', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4301', description: 'Rytm oddychania', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4302', description: 'Głębokość oddychania', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4400', description: 'Pojemność oddechowa', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4401', description: 'Przepływ oddechowy', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4550', description: 'Ogólna wytrzymałość fizyczna', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4551', description: 'Wydolność tlenowa', category: 'bodyFunction', subcategory: 'b4' },
  { code: 'b4552', description: 'Męczliwość', category: 'bodyFunction', subcategory: 'b4' },

  // ============================================
  // s7: STRUKTURY ZWIĄZANE Z RUCHEM
  // ============================================
  { code: 's7100', description: 'Kości czaszki', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7101', description: 'Kości twarzy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7102', description: 'Stawy głowy i szyi', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7103', description: 'Więzadła i powięzie głowy i szyi', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7104', description: 'Mięśnie głowy i szyi', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7200', description: 'Kości barku', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7201', description: 'Stawy obręczy barkowej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7202', description: 'Mięśnie barku', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7203', description: 'Więzadła i powięzie obręczy barkowej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7300', description: 'Kości kończyny górnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7301', description: 'Stawy kończyny górnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7302', description: 'Mięśnie kończyny górnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7303', description: 'Więzadła i powięzie kończyny górnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7400', description: 'Kości miednicy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7401', description: 'Stawy miednicy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7402', description: 'Mięśnie miednicy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7403', description: 'Więzadła i powięzie miednicy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7500', description: 'Kości kończyny dolnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7501', description: 'Stawy kończyny dolnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7502', description: 'Mięśnie kończyny dolnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7503', description: 'Więzadła i powięzie kończyny dolnej', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7600', description: 'Kręgi szyjne', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7601', description: 'Kręgi piersiowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7602', description: 'Kręgi lędźwiowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7603', description: 'Kość krzyżowa', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7604', description: 'Kość guziczna', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7700', description: 'Kości stopy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7701', description: 'Stawy stawu skokowego i stopy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7702', description: 'Mięśnie stopy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's7703', description: 'Więzadła i powięzie stopy', category: 'bodyStructure', subcategory: 's7' },

  // Struktury specyficzne (szczegółowe)
  { code: 's75000', description: 'Kość udowa', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75001', description: 'Rzepka', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75002', description: 'Kość piszczelowa', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75003', description: 'Kość strzałkowa', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75010', description: 'Staw biodrowy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75011', description: 'Staw kolanowy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75012', description: 'Staw skokowo-goleniowy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75020', description: 'Mięsień czworogłowy uda', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75021', description: 'Mięśnie kulszowo-goleniowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75022', description: 'Mięśnie łydki', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75023', description: 'Mięśnie stopy', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75030', description: 'Więzadła kolana (ACL, PCL, MCL, LCL)', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75031', description: 'Łąkotki', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75032', description: 'Więzadła stawu skokowego', category: 'bodyStructure', subcategory: 's7' },
  { code: 's75033', description: 'Ścięgno Achillesa', category: 'bodyStructure', subcategory: 's7' },

  // Kręgosłup szczegółowo
  { code: 's76000', description: 'Kręgi szyjne C1-C2', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76001', description: 'Kręgi szyjne C3-C7', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76010', description: 'Kręgi piersiowe Th1-Th6', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76011', description: 'Kręgi piersiowe Th7-Th12', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76020', description: 'Kręgi lędźwiowe L1-L3', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76021', description: 'Kręgi lędźwiowe L4-S1', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76100', description: 'Krążki międzykręgowe szyjne', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76101', description: 'Krążki międzykręgowe piersiowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76102', description: 'Krążki międzykręgowe lędźwiowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76200', description: 'Więzadła kręgosłupa', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76300', description: 'Mięśnie przykręgosłupowe', category: 'bodyStructure', subcategory: 's7' },
  { code: 's76301', description: 'Mięśnie stabilizujące tułów', category: 'bodyStructure', subcategory: 's7' },

  // ============================================
  // d4: PORUSZANIE SIĘ
  // (Najważniejsze dla fizjoterapii w aktywności)
  // ============================================
  { code: 'd4100', description: 'Kładzenie się', category: 'activity', subcategory: 'd4' },
  { code: 'd4101', description: 'Przysiadanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4102', description: 'Klękanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4103', description: 'Siadanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4104', description: 'Stanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4105', description: 'Zginanie ciała', category: 'activity', subcategory: 'd4' },
  { code: 'd4106', description: 'Przemieszczanie środka ciężkości ciała', category: 'activity', subcategory: 'd4' },
  { code: 'd4150', description: 'Utrzymywanie pozycji leżącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4151', description: 'Utrzymywanie pozycji przykucniętej', category: 'activity', subcategory: 'd4' },
  { code: 'd4152', description: 'Utrzymywanie pozycji klęczącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4153', description: 'Utrzymywanie pozycji siedzącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4154', description: 'Utrzymywanie pozycji stojącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4200', description: 'Przemieszczanie się w pozycji siedzącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4201', description: 'Przemieszczanie się w pozycji leżącej', category: 'activity', subcategory: 'd4' },
  { code: 'd4210', description: 'Przemieszczanie się ze zginaniem i przekręcaniem', category: 'activity', subcategory: 'd4' },

  // Przenoszenie
  { code: 'd4300', description: 'Podnoszenie przedmiotów', category: 'activity', subcategory: 'd4' },
  { code: 'd4301', description: 'Przenoszenie przedmiotów w rękach', category: 'activity', subcategory: 'd4' },
  { code: 'd4302', description: 'Przenoszenie przedmiotów w ramionach', category: 'activity', subcategory: 'd4' },
  { code: 'd4303', description: 'Przenoszenie przedmiotów na barkach, biodrze i plecach', category: 'activity', subcategory: 'd4' },
  { code: 'd4304', description: 'Przenoszenie przedmiotów na głowie', category: 'activity', subcategory: 'd4' },
  { code: 'd4305', description: 'Odkładanie przedmiotów', category: 'activity', subcategory: 'd4' },
  { code: 'd4350', description: 'Popychanie nogami', category: 'activity', subcategory: 'd4' },
  { code: 'd4351', description: 'Kopanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4400', description: 'Podnoszenie przedmiotów', category: 'activity', subcategory: 'd4' },
  { code: 'd4401', description: 'Chwytanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4402', description: 'Manipulowanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4403', description: 'Puszczanie', category: 'activity', subcategory: 'd4' },

  // Chodzenie i poruszanie się
  { code: 'd4500', description: 'Chodzenie na krótkie dystanse', category: 'activity', subcategory: 'd4' },
  { code: 'd4501', description: 'Chodzenie na długie dystanse', category: 'activity', subcategory: 'd4' },
  { code: 'd4502', description: 'Chodzenie po różnych nawierzchniach', category: 'activity', subcategory: 'd4' },
  { code: 'd4503', description: 'Chodzenie z omijaniem przeszkód', category: 'activity', subcategory: 'd4' },
  { code: 'd4550', description: 'Pełzanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4551', description: 'Wspinanie się', category: 'activity', subcategory: 'd4' },
  { code: 'd4552', description: 'Bieganie', category: 'activity', subcategory: 'd4' },
  { code: 'd4553', description: 'Skakanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4554', description: 'Pływanie', category: 'activity', subcategory: 'd4' },
  { code: 'd4600', description: 'Poruszanie się wewnątrz domu', category: 'activity', subcategory: 'd4' },
  { code: 'd4601', description: 'Poruszanie się wewnątrz budynków innych niż dom', category: 'activity', subcategory: 'd4' },
  { code: 'd4602', description: 'Poruszanie się poza domem i innymi budynkami', category: 'activity', subcategory: 'd4' },

  // ============================================
  // d5: SAMOOBSŁUGA
  // ============================================
  { code: 'd5100', description: 'Mycie części ciała', category: 'activity', subcategory: 'd5' },
  { code: 'd5101', description: 'Mycie całego ciała', category: 'activity', subcategory: 'd5' },
  { code: 'd5102', description: 'Osuszanie się', category: 'activity', subcategory: 'd5' },
  { code: 'd5200', description: 'Pielęgnacja skóry', category: 'activity', subcategory: 'd5' },
  { code: 'd5300', description: 'Korzystanie z toalety', category: 'activity', subcategory: 'd5' },
  { code: 'd5400', description: 'Ubieranie się', category: 'activity', subcategory: 'd5' },
  { code: 'd5401', description: 'Zdejmowanie ubrania', category: 'activity', subcategory: 'd5' },
  { code: 'd5402', description: 'Zakładanie obuwia', category: 'activity', subcategory: 'd5' },
  { code: 'd5403', description: 'Zdejmowanie obuwia', category: 'activity', subcategory: 'd5' },
  { code: 'd5500', description: 'Jedzenie', category: 'activity', subcategory: 'd5' },
  { code: 'd5501', description: 'Picie', category: 'activity', subcategory: 'd5' },

  // ============================================
  // d6: ŻYCIE DOMOWE
  // ============================================
  { code: 'd6200', description: 'Robienie zakupów', category: 'activity', subcategory: 'd6' },
  { code: 'd6300', description: 'Przygotowywanie prostych posiłków', category: 'activity', subcategory: 'd6' },
  { code: 'd6400', description: 'Pranie', category: 'activity', subcategory: 'd6' },
  { code: 'd6401', description: 'Sprzątanie miejsc do gotowania', category: 'activity', subcategory: 'd6' },
  { code: 'd6402', description: 'Sprzątanie miejsca zamieszkania', category: 'activity', subcategory: 'd6' },
  { code: 'd6500', description: 'Robienie drobnych napraw', category: 'activity', subcategory: 'd6' },
  { code: 'd6501', description: 'Pielęgnacja ogrodu', category: 'activity', subcategory: 'd6' },

  // ============================================
  // d8: GŁÓWNE DZIEDZINY ŻYCIA
  // ============================================
  { code: 'd8450', description: 'Szukanie zatrudnienia', category: 'participation', subcategory: 'd8' },
  { code: 'd8451', description: 'Utrzymanie zatrudnienia', category: 'participation', subcategory: 'd8' },
  { code: 'd8500', description: 'Samozatrudnienie', category: 'participation', subcategory: 'd8' },
  { code: 'd8501', description: 'Zatrudnienie w niepełnym wymiarze godzin', category: 'participation', subcategory: 'd8' },
  { code: 'd8502', description: 'Zatrudnienie w pełnym wymiarze godzin', category: 'participation', subcategory: 'd8' },

  // ============================================
  // d9: ŻYCIE SPOŁECZNE I OBYWATELSKIE
  // ============================================
  { code: 'd9100', description: 'Nieformalne związki towarzyskie', category: 'participation', subcategory: 'd9' },
  { code: 'd9200', description: 'Rekreacja i wypoczynek', category: 'participation', subcategory: 'd9' },
  { code: 'd9201', description: 'Sport', category: 'participation', subcategory: 'd9' },
  { code: 'd9202', description: 'Sztuka i kultura', category: 'participation', subcategory: 'd9' },

  // ============================================
  // e1: PRODUKTY I TECHNOLOGIA
  // ============================================
  { code: 'e1100', description: 'Żywność', category: 'environment', subcategory: 'e1' },
  { code: 'e1101', description: 'Leki', category: 'environment', subcategory: 'e1' },
  { code: 'e1150', description: 'Ogólne produkty i technologie do użytku osobistego w codziennym życiu', category: 'environment', subcategory: 'e1' },
  { code: 'e1151', description: 'Produkty i technologie wspomagające do użytku osobistego w codziennym życiu', category: 'environment', subcategory: 'e1' },
  { code: 'e1200', description: 'Ogólne produkty i technologie do poruszania się i transportu osobistego w pomieszczeniach i na zewnątrz', category: 'environment', subcategory: 'e1' },
  { code: 'e1201', description: 'Produkty i technologie wspomagające do poruszania się i transportu osobistego', category: 'environment', subcategory: 'e1' },

  // ============================================
  // e3: WSPARCIE I RELACJE
  // ============================================
  { code: 'e310', description: 'Najbliższa rodzina', category: 'environment', subcategory: 'e3' },
  { code: 'e315', description: 'Dalsza rodzina', category: 'environment', subcategory: 'e3' },
  { code: 'e320', description: 'Przyjaciele', category: 'environment', subcategory: 'e3' },
  { code: 'e325', description: 'Znajomi, rówieśnicy, koledzy, sąsiedzi i członkowie społeczności', category: 'environment', subcategory: 'e3' },
  { code: 'e340', description: 'Opiekunowie i asystenci osobiści', category: 'environment', subcategory: 'e3' },
  { code: 'e355', description: 'Pracownicy służby zdrowia', category: 'environment', subcategory: 'e3' },

  // ============================================
  // e5: USŁUGI, SYSTEMY I POLITYKI
  // ============================================
  { code: 'e5800', description: 'Usługi zdrowotne', category: 'environment', subcategory: 'e5' },
  { code: 'e5801', description: 'Systemy zdrowotne', category: 'environment', subcategory: 'e5' },
  { code: 'e5802', description: 'Polityki zdrowotne', category: 'environment', subcategory: 'e5' },
  { code: 'e5850', description: 'Usługi edukacyjne i szkoleniowe', category: 'environment', subcategory: 'e5' },
  { code: 'e5900', description: 'Usługi pracy i zatrudnienia', category: 'environment', subcategory: 'e5' },
];

// Funkcja pomocnicza do wyszukiwania kodów ICF
export function searchICFCodes(query: string, limit = 20): ICFCodeData[] {
  const lowerQuery = query.toLowerCase();
  return ICF_CODES.filter(
    (code) =>
      code.code.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery)
  ).slice(0, limit);
}

// Funkcja do pobrania kodów według kategorii
export function getICFCodesByCategory(category: ICFCategory): ICFCodeData[] {
  return ICF_CODES.filter((code) => code.category === category);
}

// Funkcja do pobrania kodów według podkategorii
export function getICFCodesBySubcategory(subcategory: string): ICFCodeData[] {
  return ICF_CODES.filter((code) => code.subcategory === subcategory);
}

// Popularne kody ICF (najczęściej używane w fizjoterapii)
export const POPULAR_ICF_CODES = [
  // Funkcje
  'b7101', // Ruchomość kilku stawów
  'b7300', // Siła izolowanych mięśni
  'b7305', // Siła mięśni tułowia
  'b7350', // Napięcie izolowanych mięśni
  'b7602', // Koordynacja ruchów dowolnych
  'b7700', // Wzorzec chodu
  'b28013', // Ból pleców
  'b28016', // Ból stawów
  'b4550', // Ogólna wytrzymałość fizyczna
  'b2600', // Czucie ułożenia ciała
  
  // Struktury
  's75011', // Staw kolanowy
  's75010', // Staw biodrowy
  's7600', // Kręgi szyjne
  's7602', // Kręgi lędźwiowe
  's75030', // Więzadła kolana
  's76102', // Krążki międzykręgowe lędźwiowe
  
  // Aktywność i uczestnictwo
  'd4500', // Chodzenie na krótkie dystanse
  'd4154', // Utrzymywanie pozycji stojącej
  'd4104', // Stanie
  'd4551', // Wspinanie się
  'd4300', // Podnoszenie przedmiotów
  'd5400', // Ubieranie się
  'd9201', // Sport
];

// Etykiety kategorii ICF
export const ICF_CATEGORY_LABELS: Record<ICFCategory, string> = {
  bodyFunction: 'Funkcje ciała (b)',
  bodyStructure: 'Struktury ciała (s)',
  activity: 'Aktywność (d)',
  participation: 'Uczestnictwo (d)',
  environment: 'Czynniki środowiskowe (e)',
};

// Kolory kategorii ICF (dla UI)
export const ICF_CATEGORY_COLORS: Record<ICFCategory, string> = {
  bodyFunction: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  bodyStructure: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  activity: 'bg-green-500/20 text-green-500 border-green-500/30',
  participation: 'bg-teal-500/20 text-teal-500 border-teal-500/30',
  environment: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
};

