// Vizag (Visakhapatnam) locations from OSM data
export interface VizagLocation {
  name: string;
  lat: number;
  lng: number;
}

// Parsed from vizag-road-network.csv
export const VIZAG_LOCATIONS: VizagLocation[] = [
  { name: "Apollo Heart Hospital", lat: 17.717130152777795, lng: 83.30924034118654 },
  { name: "Lazarus Hospital", lat: 17.717048392973915, lng: 83.30801725387575 },
  { name: "7 Hills Hospital", lat: 17.717784229866965, lng: 83.30984115600587 },
  { name: "Omni RK Hospital", lat: 17.71866314219905, lng: 83.31162214279176 },
  { name: "Care Hospital", lat: 17.720420953940177, lng: 83.31271648406984 },
  { name: "Care Maharanipeta", lat: 17.709792061955064, lng: 83.30554962158205 },
  { name: "KGH", lat: 17.708810901714486, lng: 83.30612897872926 },
  { name: "ABC Hospital", lat: 17.706071800982382, lng: 83.30926179885866 },
  { name: "Nature Cure Hospital", lat: 17.707604884901986, lng: 83.31115007400514 },
  { name: "My Cure Hospital", lat: 17.711917890736718, lng: 83.31454038619997 },
  { name: "St Josephs Hospital", lat: 17.711427317099698, lng: 83.31198692321779 },
  { name: "Medicover Hospital", lat: 17.712510665424997, lng: 83.31376791000368 },
  { name: "Kalavathi Surgical Hospital", lat: 17.72671623135451, lng: 83.29898357391359 },
  { name: "Padmasri Hospital", lat: 17.738243373981593, lng: 83.30368280410768 },
  { name: "Queens NRI Hospital", lat: 17.74043017726912, lng: 83.30803871154787 },
  { name: "Amma Hospital", lat: 17.746683878544864, lng: 83.33078384399415 },
  { name: "Medicover MVP", lat: 17.747848759551463, lng: 83.33185672760011 },
  { name: "MVP Hospital", lat: 17.741779033272383, lng: 83.33518266677858 },
  { name: "VIMS", lat: 17.759149755400166, lng: 83.33005428314209 },
  { name: "Apollo Arilova", lat: 17.761193258915483, lng: 83.31767320632936 },
  { name: "Care Arilova", lat: 17.761663261421862, lng: 83.3152484893799 },
  { name: "Medicover Arilova", lat: 17.764626292264488, lng: 83.31284523010255 },
  { name: "Star Pinacle Arilova", lat: 17.762971087983438, lng: 83.30821037292482 },
  { name: "MGR Hospital", lat: 17.73245945716697, lng: 83.33086967468263 },
  { name: "Government TB Hospital", lat: 17.72334378880226, lng: 83.33101987838747 },
  { name: "AN Beach Hospital", lat: 17.71291947441363, lng: 83.31975460052492 },
  { name: "Krishna Hospital", lat: 17.710213652597947, lng: 83.31100791692735 },
  { name: "Rani Chandramathi Hospital", lat: 17.728984929735336, lng: 83.33662033081056 },
  { name: "VUDA Park", lat: 17.721810839396685, lng: 83.33559036254884 },
  { name: "RK Beach (Novotel)", lat: 17.71059436087277, lng: 83.31682562828065 },
  { name: "RK Beach Circle", lat: 17.71150396931892, lng: 83.31810772418977 },
  { name: "Nowroji Road", lat: 17.71460069158551, lng: 83.3125287294388 },
  { name: "Ramnagar Circle", lat: 17.71781488967198, lng: 83.30950856208803 },
  { name: "Old Jail Road Circle", lat: 17.71997128280938, lng: 83.30632209777832 },
  { name: "Dabagardens", lat: 17.72120276583515, lng: 83.30340385437013 },
  { name: "GVMC Circle", lat: 17.723624828104835, lng: 83.30522775650026 },
  { name: "Asilmetta Junction", lat: 17.724754090678807, lng: 83.3061718940735 },
  { name: "Diamond Park", lat: 17.726818425592903, lng: 83.30353260040283 },
  { name: "Dwarkanagar ICICI Bank", lat: 17.72656293988767, lng: 83.30626308918 },
  { name: "4th Town Junction", lat: 17.7377733099755, lng: 83.30469131469728 },
  { name: "Akkayyapalem Junction", lat: 17.740552800961947, lng: 83.29991698265077 },
  { name: "Maharani Parlour", lat: 17.73525946848392, lng: 83.29988479614259 },
  { name: "Thatichetlapalem", lat: 17.73375727807209, lng: 83.28787922859193 },
  { name: "Railway New Colony", lat: 17.727799487316908, lng: 83.29117298126222 },
  { name: "Dondaparthy", lat: 17.727247640757902, lng: 83.29929471015932 },
  { name: "Railway Station Signal", lat: 17.723629937906253, lng: 83.29319000244142 },
  { name: "DRM Office", lat: 17.725265066881413, lng: 83.29890847206117 },
  { name: "Allipuram Junction", lat: 17.718867539798453, lng: 83.29233169555665 },
  { name: "Jagadamba Center", lat: 17.711897450195288, lng: 83.30241680145265 },
  { name: "Leelamahal", lat: 17.713231190641476, lng: 83.29887092113496 },
  { name: "Dolphin Hotel", lat: 17.712411018092798, lng: 83.29764515161516 },
  { name: "Saraswathi Park", lat: 17.714145895789773, lng: 83.300319314003 },
  { name: "Choultry", lat: 17.70970007841043, lng: 83.30130100250246 },
  { name: "RK Beach Gokul Park", lat: 17.70533080572647, lng: 83.30988943576814 },
  { name: "Allipuram Main Road", lat: 17.720359635216017, lng: 83.29639792442323 },
  { name: "Zilla Parishad", lat: 17.710435945447163, lng: 83.3109810948372 },
  { name: "KGH Ingate", lat: 17.708698476760983, lng: 83.30700874328615 },
  { name: "Central Pharmacy KGH", lat: 17.708213004562086, lng: 83.3080279827118 },
  { name: "RTC Complex Asilmetta", lat: 17.724549699789943, lng: 83.30844640731813 },
  { name: "Sampath Vinayaka Temple", lat: 17.724467943369156, lng: 83.31209421157838 },
  { name: "Tycoon Circle", lat: 17.72495848133464, lng: 83.31687927246095 },
  { name: "VIP Road BRTS", lat: 17.729598086530213, lng: 83.31408977508546 },
  { name: "Dutt Island", lat: 17.723875208203303, lng: 83.31825256347658 },
  { name: "Childrens Theatre", lat: 17.721013700526, lng: 83.32001209259035 },
  { name: "Pedda Waltair Junction", lat: 17.731682803940448, lng: 83.33404541015626 },
  { name: "Pollamamba Junction", lat: 17.73010904892342, lng: 83.32893848419191 },
  { name: "Jallaripeta", lat: 17.730272556581546, lng: 83.34020376205446 },
  { name: "Shivajipalem Highway", lat: 17.740491489126015, lng: 83.32732915878297 },
  { name: "Maddilipalem", lat: 17.73552516071524, lng: 83.32024812698366 },
  { name: "Satyam Junction", lat: 17.734421513481028, lng: 83.31290960311891 },
  { name: "Gurudwara Junction", lat: 17.736771865153464, lng: 83.30773830413818 },
  { name: "Seethamadara", lat: 17.743332248812006, lng: 83.314368724823 },
  { name: "Port Stadium Back Gate", lat: 17.741779033272383, lng: 83.30400466918947 },
  { name: "Highway Lawsons Bay Colony", lat: 17.739352107022597, lng: 83.30352187156679 },
  { name: "Venkojipalem", lat: 17.746847371073233, lng: 83.32876682281496 },
  { name: "Isakathota", lat: 17.742800887117177, lng: 83.32799434661867 },
  { name: "Hanumanthwaka Junction", lat: 17.75528747000655, lng: 83.33269357681276 },
  { name: "RK Beach Kailashagiri", lat: 17.75026024351113, lng: 83.34891557693481 },
  { name: "Mudasarlova", lat: 17.761540652191435, lng: 83.2970952987671 },
  { name: "4th Town Police Station", lat: 17.73815906911475, lng: 83.30509632825853 },
  { name: "Police Barracks", lat: 17.71048576966869, lng: 83.29945832490922 },
  { name: "2 Town Police Station", lat: 17.72841264816745, lng: 83.32608461380006 },
  { name: "Fire Station Police Barracks Road", lat: 17.71145797799132, lng: 83.29843103885652 },
];

// Get location by name
export function getLocationByName(name: string): VizagLocation | undefined {
  return VIZAG_LOCATIONS.find(loc => 
    loc.name.toLowerCase() === name.toLowerCase()
  );
}

// Get locations for dropdown
export function getLocationOptions() {
  return VIZAG_LOCATIONS.map(loc => ({
    value: loc.name,
    label: loc.name,
    coordinates: { lat: loc.lat, lng: loc.lng }
  })).sort((a, b) => a.label.localeCompare(b.label));
}

// Default locations for Vizag
export const VIZAG_CENTER = { lat: 17.7250, lng: 83.3100 };
export const DEFAULT_SOURCE_VIZAG = VIZAG_LOCATIONS[0]; // Apollo Heart Hospital
export const DEFAULT_DESTINATION_VIZAG = VIZAG_LOCATIONS[18]; // VIMS
