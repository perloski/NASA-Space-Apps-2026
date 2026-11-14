// Glosario en lenguaje simple. Lo usan la página /glossary y los enlaces "Learn more" de las
// ayudas (help.js → terms). Cada término: id (ancla en la URL), term, short (una frase) y text.

export const GLOSSARY = [
  {
    id: 'sky-coordinates', term: 'Sky coordinates (RA and Dec)',
    short: 'Two numbers that say where something is in the sky, like latitude and longitude on Earth.',
    text: 'Imagine the sky as a giant ball around the Earth. Right Ascension (RA) goes around it, from 0 to 360 degrees, like longitude. Declination (Dec) goes from −90 at the south pole of the sky to +90 at the north pole, like latitude. Every star, galaxy or planet has its own pair of numbers.',
    example: 'WISE 0855 is at about RA 133.76, Dec −7.24.',
  },
  {
    id: 'arcminute', term: 'Degree, arcminute and arcsecond',
    short: 'Units for measuring sizes and distances in the sky.',
    text: 'Sizes in the sky are measured as angles. A full circle has 360 degrees; one degree is split into 60 arcminutes, and one arcminute into 60 arcseconds. They are tiny: an arcsecond is about the size of a coin seen from 4 kilometers away.',
    example: 'The full Moon is about 30 arcminutes (half a degree) wide.',
  },
  {
    id: 'field-of-view', term: 'Field of view',
    short: 'How much sky fits in the picture.',
    text: 'A small field of view is like zooming in with a camera: you see fewer things but bigger. A large one shows more sky around the object, which helps to follow objects that move a lot.',
  },
  {
    id: 'infrared', term: 'Infrared light',
    short: 'Light with colors “redder than red”, invisible to our eyes.',
    text: 'Light comes in many colors, and our eyes only see a small range of them. Beyond red there is infrared light: we cannot see it, but we can feel it as heat. Cold objects in space, like brown dwarfs or dust clouds, shine mostly in infrared, so infrared telescopes such as SPHEREx can find things that ordinary telescopes miss.',
    example: 'A TV remote control talks to the TV using infrared light.',
  },
  {
    id: 'wavelength', term: 'Wavelength (µm)',
    short: 'The number that identifies each color of light.',
    text: 'Each color of light has a wavelength. Infrared wavelengths are measured in micrometers (µm), thousandths of a millimeter. Visible red light is about 0.7 µm; SPHEREx sees from 0.75 to 5 µm.',
  },
  {
    id: 'detector', term: 'Detector',
    short: 'The part of the camera that captures the light; SPHEREx has six, one for each range of infrared colors.',
    text: 'SPHEREx splits the infrared light into six ranges and has one detector for each: D1 sees the infrared colors closest to visible red, D6 the furthest away. Looking at the same object in different detectors tells us what it is made of and how hot it is.',
  },
  {
    id: 'spherex', term: 'SPHEREx',
    short: 'A NASA space telescope that maps the whole sky in 102 infrared colors.',
    text: 'SPHEREx was launched in 2025. Every six months it photographs the entire sky, so it is perfect for finding things that move or change. Its main goals are to study how the universe began, how galaxies formed, and where the water and ice of planets come from.',
  },
  {
    id: 'epoch', term: 'Epoch',
    short: 'One of the times SPHEREx photographed a patch of sky.',
    text: 'SPHEREx goes back to the same patch of sky about every six months. Each of those visits is an epoch. Comparing epochs is how you discover what moved or changed. Near the poles of the sky SPHEREx looks almost all the time, so there the epochs are grouped by month.',
  },
  {
    id: 'blink', term: 'Blinking',
    short: 'Showing pictures of the same place taken on different dates, one after another.',
    text: 'It is the oldest trick for discovering moving objects: when you switch quickly between two pictures, the stars stay still and anything that moved seems to jump. Pluto was discovered this way in 1930, and volunteers still use it today to find new objects.',
  },
  {
    id: 'difference', term: 'Difference image',
    short: 'A picture made by subtracting an older picture from a newer one.',
    text: 'If nothing changed, everything cancels out and becomes gray. If an object moved, it leaves a black spot where it was and a white spot where it is now. If an object got brighter it looks white; fainter, black.',
  },
  {
    id: 'stacking', term: 'Stacking',
    short: 'Adding several pictures of the same place to get a cleaner one.',
    text: 'Each single photo has some random noise, like the grain of a photo taken at night. Averaging many photos of the same spot cancels the noise and makes faint objects visible. In this viewer, each epoch is a stack of up to 24 photos.',
  },
  {
    id: 'stretch', term: 'Stretch',
    short: 'How the brightness measured by the telescope is turned into shades of gray.',
    text: 'The sky has extremely faint and extremely bright things side by side, much more contrast than a screen can show. A stretch chooses how to squeeze that range into black-to-white so you can see what interests you.',
  },
  {
    id: 'pixel', term: 'Pixel',
    short: 'Each tiny square of a digital picture.',
    text: 'Each SPHEREx pixel covers about 6 arcseconds of sky. A star usually covers one or two pixels, so in these pictures stars look like small squares.',
  },
  {
    id: 'flagged-pixel', term: 'Flagged pixel',
    short: 'A pixel with a known problem that should not be trusted.',
    text: 'Sometimes a pixel is wrong: a cosmic ray (a particle from space) hit the camera, the pixel is damaged, or a very bright star nearby spilled light. The SPHEREx team marks those pixels so they can be ignored. This viewer hides them before building the images.',
  },
  {
    id: 'brown-dwarf', term: 'Brown dwarf',
    short: 'A “failed star”: too big to be a planet, too small to shine like a star.',
    text: 'Brown dwarfs are balls of gas that never got hot enough to burn like the Sun. They are cold and faint, so they glow mostly in infrared. Many of the nearest ones were discovered by volunteers comparing infrared pictures.',
    example: 'WISE 0855 is the coldest known brown dwarf: about −25 °C, colder than a freezer.',
  },
  {
    id: 'proper-motion', term: 'Proper motion',
    short: 'How fast a star moves across the sky, as seen from Earth.',
    text: 'All stars move, but most are so far away that they seem fixed. Nearby stars shift a little every year. The closer and faster a star is, the bigger its proper motion. It is measured in arcseconds per year.',
    example: 'Barnard’s Star moves about 10 arcseconds per year: in 180 years it travels the width of the full Moon.',
  },
  {
    id: 'variable-star', term: 'Variable star',
    short: 'A star whose brightness changes over time.',
    text: 'Some stars swell and shrink, others are surrounded by dust that comes and goes, or have a companion that blocks their light. Measuring their brightness on many dates (a light curve) reveals how they change.',
    example: 'R Draconis gets brighter and fainter every 245 days.',
  },
  {
    id: 'flux', term: 'Flux (brightness)',
    short: 'How much light arrives from an object; how bright it looks.',
    text: 'In this viewer, flux is measured in MJy/sr, a unit astronomers use for the brightness of each bit of sky. You do not need the unit to compare: a higher number simply means brighter.',
  },
  {
    id: 'spectrum', term: 'Spectrum',
    short: 'How bright an object is in each color of light.',
    text: 'Splitting light into its colors reveals what an object is made of: each molecule absorbs some specific colors and leaves “dips” in the spectrum, like a fingerprint. Water and methane leave clear dips in the spectrum of cold brown dwarfs.',
  },
  {
    id: 'light-curve', term: 'Light curve',
    short: 'How the brightness of an object changes over time.',
    text: 'A chart with the date on one axis and the brightness on the other. A flat line means the object does not change; ups and downs mean it is variable.',
  },
  {
    id: 'gaia', term: 'Gaia',
    short: 'A European space telescope that measured the positions of almost 2 billion stars.',
    text: 'Gaia measured where each star is and how it moves with incredible precision. This viewer draws Gaia stars as blue circles and moves each one to where it was on the date being shown. Gaia sees visible light, so very cold objects like brown dwarfs are usually missing from it.',
  },
  {
    id: 'wise', term: 'WISE and AllWISE',
    short: 'A NASA infrared space telescope that mapped the whole sky around 2010.',
    text: 'WISE photographed the whole sky in four infrared colors; AllWISE is the combined map. Comparing it with SPHEREx, taken about 15 years later, shows how nearby objects have moved.',
  },
  {
    id: '2mass', term: '2MASS',
    short: 'An infrared map of the whole sky made from two ground telescopes between 1997 and 2001.',
    text: 'Because it is about 25 years older than SPHEREx, it is great for seeing how far nearby stars have moved in that time.',
  },
  {
    id: 'zodiacal-light', term: 'Zodiacal light',
    short: 'A faint glow from dust in our own Solar System.',
    text: 'Tiny dust grains between the planets reflect sunlight and glow in infrared. That glow covers the whole sky like a fog. SPHEREx models it and this viewer subtracts it, so the stars and galaxies stand out.',
  },
]

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]))
