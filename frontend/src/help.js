// Textos de ayuda de cada control, en lenguaje simple para personas sin formación científica.
// Todos los textos están acá (y no repartidos por los componentes) para poder revisarlos juntos
// y, más adelante, traducirlos.
//
// Formato de cada entrada:
//   title  nombre del control
//   does   qué hace (1–2 frases)
//   see    qué vas a ver en pantalla al cambiarlo
//   tip    (opcional) un consejo práctico

// Una frase por objeto de ejemplo: botones de la pantalla de coordenadas y su recorrido.
export const TARGET_BLURBS = {
  barnard: 'The star that moves fastest across our sky.',
  epsindib: 'A pair of brown dwarfs orbiting a nearby star.',
  wise0855: 'The coldest known brown dwarf: it visibly jumps between dates.',
  rwaur: 'A young star whose brightness changes irregularly.',
  rdra: 'A giant star that brightens and fades every 8 months.',
}

export const HELP = {
  // ------------------------------------------------------------------ pantalla de coordenadas
  coordsInput: {
    title: 'Sky coordinates',
    terms: ['sky-coordinates'],
    does: 'Tells the viewer which spot of the sky to show. Astronomers use two numbers, a bit like latitude and longitude on Earth: Right Ascension (RA, from 0 to 360, going around the sky) and Declination (Dec, from −90 at the south pole of the sky to +90 at the north pole).',
    see: 'After pressing Enter you will see that patch of sky as photographed by SPHEREx, with the exact spot you typed in the center.',
    tip: 'Not sure what to type? Pick one of the examples below: each one is a famous object worth looking at.',
  },
  targets: {
    title: 'Example objects',
    terms: ['brown-dwarf', 'proper-motion'],
    does: 'Opens the viewer on objects chosen by NASA for this challenge. Their positions are already corrected for how much they have moved in recent years.',
    see: 'Each button takes you straight to that object. Hover a button to see its coordinates.',
    tip: 'Start with WISE 0855: it is a cold “failed star” that moves so fast you can see it jump between images.',
  },

  // ------------------------------------------------------------------ barra lateral del visor
  coords: {
    title: 'Right ascension and declination',
    terms: ['sky-coordinates'],
    does: 'The position in the sky the viewer is centered on: first RA (0 to 360), then Dec (−90 to +90), in degrees, separated by a space.',
    see: 'Type new numbers and press Enter: the viewer jumps to that spot and downloads its images.',
    tip: 'The first visit to a new spot takes a while (the images are being downloaded). Going back to a spot you already visited is instant.',
  },
  fov: {
    title: 'Field of view',
    terms: ['arcminute', 'field-of-view'],
    does: 'How big the piece of sky in the window is, measured in arcminutes. One arcminute is a tiny angle: the full Moon is about 30 arcminutes wide.',
    see: 'A small number zooms in on the object in the center. A big number shows a wider area with more stars around it.',
    tip: 'Use a bigger field for objects that move fast, so they do not leave the picture. Bigger fields take longer to load the first time.',
  },
  detector: {
    title: 'Detector (infrared “color”)',
    terms: ['infrared', 'detector', 'wavelength'],
    does: 'SPHEREx sees infrared light, which is invisible to our eyes. Its camera has six detectors (D1 to D6); each one sees a different range of infrared “colors”, from D1 (closest to visible red) to D6 (furthest away).',
    see: 'The same patch of sky can look very different in each detector: some objects are bright in one and almost invisible in another.',
    tip: 'Cold objects such as brown dwarfs shine most in D5 and D6. Ordinary stars look brighter in D1 to D3. “All” adds the six together: a cleaner image, but you lose the color information and it loads slower.',
  },
  mode: {
    title: 'Viewing mode',
    terms: ['blink', 'epoch', 'difference'],
    does: 'Chooses how the pictures taken on different dates are shown.',
    see: '“Blink epochs” plays the sky like a flipbook, one picture every 6 months: stars stay still and anything that moved appears to jump. “Single frames” shows the individual photos one by one (more dates, but each one is noisier). “Difference” subtracts an old picture from a new one: everything that did not change turns gray, and something that moved shows up as a black-and-white pair.',
    tip: 'Looking for something that moves? Start with “Blink epochs”, then confirm it with “Difference”.',
  },
  diffEpochs: {
    title: 'Dates to compare',
    terms: ['difference'],
    does: 'In Difference mode, picks the two dates that are compared: picture B minus picture A.',
    see: 'Objects that got brighter look white, objects that got fainter look black. Something that moved leaves a black spot where it was (A) and a white spot where it is now (B).',
    tip: 'Choose dates far apart: the further apart, the more a moving object will have traveled.',
  },
  stretch: {
    title: 'Stretch (brightness scale)',
    terms: ['stretch'],
    does: 'Decides how the brightness measured by the telescope is turned into shades of gray on your screen.',
    see: '“asinh” shows faint and bright things at the same time (recommended). “linear” keeps the true proportions: bright stars look right but faint things almost disappear. “zscale” boosts the dark background so the faintest objects pop out, while bright stars become white blobs.',
    tip: 'If you cannot see anything, try “zscale”. If everything looks washed out, go back to “asinh”.',
  },
  defaults: {
    title: 'Apply defaults',
    does: 'Puts every setting back to its starting value. The position in the sky does not change.',
    see: 'The viewer reloads with the recommended settings.',
  },
  blink: {
    title: 'Blink interval',
    does: 'How long each picture stays on screen before the next one appears, in milliseconds (1000 ms = 1 second).',
    see: 'Lower values make the animation faster; higher values give you more time to look at each picture.',
    tip: 'Between 300 and 600 ms is usually the easiest speed for spotting something that jumps.',
  },
  opacity: {
    title: 'SPHEREx opacity',
    does: 'How see-through the SPHEREx picture is on top of the background map.',
    see: 'At 100% you only see SPHEREx. Lower it to let the map from another telescope show through and compare both.',
    tip: 'Slide it back and forth quickly: anything that appears in one picture and not in the other is worth a closer look.',
  },
  background: {
    title: 'Background map',
    terms: ['wise', '2mass'],
    does: 'A map of the whole sky made by another telescope, shown under and around the SPHEREx picture.',
    see: '“AllWISE” is an infrared map taken by NASA’s WISE satellite around 2010, so you can compare with SPHEREx 15 years later. “AllWISE W2” shows a single infrared color very close to D5 and D6. “2MASS” is an infrared map from 1997–2001: the longest time gap, perfect for seeing how far nearby stars have moved.',
    tip: 'It starts on “None”, showing only SPHEREx. Pick a map to compare SPHEREx with older pictures of the same spot.',
  },
  gaia: {
    title: 'Gaia stars',
    terms: ['gaia', 'brown-dwarf'],
    does: 'Draws a blue circle around every star measured by ESA’s Gaia mission, the most precise map of stars ever made. Each circle is moved to where that star was on the date being shown.',
    see: 'Blue circles over the stars in the picture. They follow the stars as the animation plays.',
    tip: 'Something that moves and has no circle is interesting: it may be an object too faint or too cold for Gaia to see, like a brown dwarf.',
  },
  invert: {
    title: 'Invert pixel values',
    does: 'Swaps black and white in the SPHEREx picture.',
    see: 'Black stars on a white sky, like a photographic negative.',
    tip: 'Many people find faint dots easier to see this way. It is also better for printing.',
  },
  share: {
    title: 'Copy share link',
    does: 'Copies a web address that opens exactly this view: the same spot of the sky and the same settings.',
    see: 'The button says “Link copied!”. Paste the link in a message, an email or a web page.',
    tip: 'Found something interesting? Share the link so others can check it.',
  },
  frameQuality: {
    title: 'Picture quality',
    terms: ['flagged-pixel', 'pixel'],
    does: 'Information about the single photo being shown, to know how much you can trust it.',
    see: '“Coverage”: how much of the window this photo covers (less than 100% means the object fell near the edge of the camera). “Flagged pixels”: share of pixels with a known problem, such as a cosmic-ray hit. “Target flagged”: whether the exact center has one of those problems.',
    tip: 'If something only appears in a photo with problems, it is probably not real.',
  },
  dataSummary: {
    title: 'About this data',
    terms: ['epoch', 'stacking'],
    does: 'A summary of what was found for this spot of the sky.',
    see: 'How many photos SPHEREx took here, grouped into “epochs” (each time SPHEREx scanned this area, about every 6 months), which data releases they come from, and how many Gaia stars are nearby.',
  },

  // ------------------------------------------------------------------ zona central
  player: {
    title: 'Animation controls',
    does: 'Play or pause the animation and move between dates one by one.',
    see: 'The text shows which date (or photo) is on screen. Each dot is one date: click a dot to jump to it.',
    tip: 'Pause and use ◀ ▶ to compare two dates calmly. Keyboard: Tab to the buttons and press Enter.',
  },
  photometry: {
    title: 'Measure target flux',
    terms: ['flux'],
    does: 'Measures how bright the object in the center is in every photo SPHEREx took of it.',
    see: 'A chart with one dot per photo. Hollow dots are photos where the measurement may be affected by a known problem.',
    tip: 'This can take a few minutes the first time, because every photo has to be downloaded and measured.',
  },
  photViews: {
    title: 'Spectrum or light curve',
    terms: ['spectrum', 'light-curve', 'variable-star'],
    does: 'Shows the same measurements in two different ways.',
    see: '“Spectrum”: brightness for each infrared color. Dips in the line are fingerprints of molecules such as water or methane, which is how scientists recognize cold brown dwarfs. “Light curve”: brightness over time, for one detector. A variable star like R Draconis goes up and down.',
    tip: 'For the light curve, pick the detector where the object is brightest.',
  },
  // ------------------------------------------------------------------ recetas, marca, leyenda, recorrido
  recipes: {
    title: 'Quick recipes',
    does: 'Ready-made settings for the most common things people come to do. One click changes several settings at once.',
    see: 'The viewer reloads with the settings of the recipe. You can still change anything afterwards.',
    tip: 'New here? “Spot something that moves” is a great first try.',
  },
  recipeMove: {
    title: 'Spot something that moves',
    terms: ['blink', 'proper-motion'],
    does: 'Plays all the dates as an animation, using all six detectors added together for the cleanest picture.',
    see: 'A flipbook of the sky: stars stay put and anything that moved seems to jump from one place to another.',
    tip: 'Watch the orange circle in the center first, then look around it for anything else that jumps.',
  },
  recipeConfirm: {
    title: 'Confirm the movement',
    terms: ['difference'],
    does: 'Subtracts the first date from the last one, the two dates that are furthest apart.',
    see: 'A gray picture where anything that moved shows up as a black spot (where it was) next to a white spot (where it is now).',
  },
  recipeCold: {
    title: 'Look for cold objects',
    terms: ['brown-dwarf', 'infrared'],
    does: 'Switches to detector D5, the infrared “color” where cold objects such as brown dwarfs shine the most, and uses the WISE map at a similar color as background.',
    see: 'Ordinary stars look fainter than usual and cold objects stand out.',
    tip: 'Something bright here that does not have a blue Gaia circle could be a brown dwarf.',
  },
  recipeVariable: {
    title: 'Watch brightness change',
    terms: ['variable-star', 'light-curve'],
    does: 'Uses a linear brightness scale, so changes in brightness are not hidden, and prepares the light curve chart.',
    see: 'In the animation, a variable star gets bigger and brighter or smaller and fainter. Press “Measure target flux” below to see its light curve.',
  },
  marker: {
    title: 'Mark the target',
    terms: ['proper-motion'],
    does: 'Draws an orange circle around the object at the center. For objects that move fast, an arrow shows where it is heading.',
    see: 'The arrow points to where the object will be in 10 years. The animation shows only a small part of that trip.',
    tip: 'Turn it off to look at the object without anything covering it.',
  },
  caption: {
    title: 'What am I looking at?',
    does: 'A short description of what is on screen right now, updated as you change the settings or the animation advances.',
    see: 'Which date and which infrared “color” you are looking at, and what to look for.',
  },
  tour: {
    title: 'Guided tour',
    does: 'A step-by-step walk through the viewer, pointing at each part and explaining what it is for.',
    see: 'A highlighted part of the screen with a short explanation. Use “Next” and “Back” to move, or “Skip” to leave at any time.',
  },
  glossary: {
    title: 'Glossary',
    does: 'Opens a list of the space words used in this viewer, explained in simple terms.',
    see: 'The glossary opens in a new tab, so you do not lose what you are looking at.',
  },
}
