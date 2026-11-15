// Textos de la interfaz en INGLÉS: el idioma de referencia.
// Cada locales/<código>.js tiene esta misma estructura; si a un idioma le falta un texto, se usa este.
// help: ayuda de cada control (title, does, see, tip, terms) · glossary: términos por id
// (term, short, text, example) · tours: recorridos guiados · caption: leyenda "What am I looking at?".
// No modificar las claves ni los {marcadores}: el código los usa.
export default {
  "targetNames": {
    "barnard": "Barnard's Star",
    "epsindib": "Epsilon Indi B",
    "wise0855": "WISE 0855",
    "rwaur": "RW Aurigae",
    "rdra": "R Draconis"
  },
  "ui": {
    "back": "← BACK",
    "language": "Language",
    "glossary": "Glossary",
    "kicker": "NASA Space App Challenge 2026 - Team Athenas IV",
    "tagline": "Bringing the cosmos to everyone",
    "start": "START",
    "aboutSpherex": "About SPHEREx",
    "aboutChallenge": "About The Challenge",
    "aboutTeam": "About The Team",
    "enterCoords": "Enter sky coordinates",
    "coordsAria": "Sky coordinates",
    "suggestedFormat": "Suggested format: {example}",
    "coordsError": "Use decimal degrees: “RA Dec”, e.g. {example}",
    "orTry": "or try:",
    "howItWorks": "🧭 How does this work?",
    "coordsTooltip": "RA {ra}°  Dec {dec}°",
    "fovShort": "FOV {fov}′",
    "loading": "Loading…",
    "customCoords": "Custom coordinates",
    "takeTour": "🧭 Take the tour",
    "glossaryLink": "📖 Glossary",
    "captureTitle": "Like what you see? Capture it!",
    "captureBtn": "Download image",
    "captureFailed": "Couldn't capture the image.",
    "coordsEpoch": "coords {epoch}",
    "querying": "Querying SPHEREx archive…",
    "loadingImages": "Loading SPHEREx images {loaded}/{total}… (the first time can take ~30 s)",
    "someFailed": "Some images failed: {error}",
    "queryingSlow": "The SPHEREx archive (IRSA, NASA) is taking longer than usual… still waiting.",
    "gaiaLoading": "Loading Gaia stars (ESA)… SPHEREx images don’t wait for Gaia.",
    "gaiaFailed": "Gaia (ESA) is not responding right now. SPHEREx images work as usual, just without the Gaia stars.",
    "gaiaRetry": "Retry Gaia",
    "gaiaUnavailableShort": "Gaia not responding",
    "pickTwo": "Pick two different epochs.",
    "enterToStart": "Enter coordinates to start.",
    "framesStacked": "{det} · {n} frames stacked",
    "aladinFailed": "Aladin could not start: {error}",
    "quickRecipes": "Quick recipes",
    "recipeMove": "Spot something that moves",
    "recipeConfirm": "Confirm the movement",
    "recipeCold": "Look for cold objects",
    "recipeVariable": "Watch brightness change",
    "raDec": "Right ascension and declination",
    "raDecHint": "Numbers only (and + − .), in degrees. Press Enter to load.",
    "fov": "Field of view (arcmin, max 30)",
    "detector": "Detector",
    "allDetectors": "All (D1–D6)",
    "mode": "Mode",
    "modeBlink": "Blink epochs",
    "modeFrames": "Single frames",
    "modeDiff": "Difference",
    "framesNeedDetector": "Single frames need one detector: showing D5.",
    "diffHint": "Epoch B − epoch A. Moving objects show as a black/white pair.",
    "epochA": "Epoch A",
    "epochB": "Epoch B",
    "stretch": "Stretch",
    "applyDefaults": "Apply defaults",
    "blinkInterval": "Blink interval",
    "ms": "ms",
    "opacity": "SPHEREx opacity",
    "background": "Background map",
    "bgAllwise": "AllWISE (color)",
    "bgAllwiseW2": "AllWISE W2 (4.6 µm)",
    "bg2mass": "2MASS (color)",
    "bgNone": "None",
    "gaiaStars": "Gaia stars (blue circles)",
    "markTarget": "Mark the target (orange)",
    "invert": "Invert pixel values",
    "copyLink": "Copy share link",
    "linkCopied": "Link copied!",
    "copyFailed": "Copy failed",
    "frame": "Frame",
    "coverage": "Coverage",
    "flaggedPixels": "Flagged pixels",
    "targetFlagged": "Target flagged",
    "notComputed": "not computed yet",
    "yes": "yes",
    "no": "no",
    "frames": "Frames",
    "epochs": "Epochs",
    "data": "Data",
    "gaiaCount": "Gaia stars",
    "units": "Units",
    "zodiSubtracted": "zodiacal light subtracted",
    "previous": "Previous",
    "next": "Next",
    "play": "▶ Play",
    "pause": "❚❚ Pause",
    "playAria": "Play",
    "pauseAria": "Pause",
    "showN": "Show {n}",
    "spectrum": "Spectrum",
    "lightCurve": "Light curve",
    "measure": "Measure target flux",
    "measuring": "Measuring…",
    "close": "✕ Close",
    "closeAria": "Close spectrum panel",
    "showSpectrum": "Show spectrum",
    "showLightCurve": "Show light curve",
    "measuringNote": "Measuring the target in every frame. The first time can take a few minutes.",
    "measuringNoteDet": "Measuring the target in every frame of {det}. The first time can take a few minutes.",
    "photIntro": "Flux at the target position in each frame: plot it against wavelength (spectrum, e.g. methane and water absorption in brown dwarfs) or against time (light curve, for variable stars).",
    "pointsMeasured": "{n} points measured. Open the panel to see the chart and the data.",
    "pointsLegend": "{n} points · ● good · ○ flagged pixel in aperture · flux in {units}",
    "saturated1": "⚠ This star is so bright that it saturates the camera: its center cannot be measured. The points come from its edges (the “wings” of its light), so they show",
    "saturatedBold": "how the brightness changes",
    "saturated2": "over time, not its true total brightness. Compare points of the same detector.",
    "showTable": "Show data table",
    "tableAria": "Photometry data table",
    "lcDetAria": "Light curve detector",
    "opensGlossary": "(opens the glossary)",
    "opensGlossaryTab": "Opens the glossary in a new tab.",
    "colFrame": "Frame",
    "colFrameWhat": "Name of the single photo",
    "colDet": "Det",
    "colDetWhat": "Detector: infrared “color” range",
    "colWave": "λ (µm)",
    "colWaveWhat": "Wavelength: the exact infrared color measured",
    "colMjd": "MJD",
    "colMjdWhat": "Date of the photo, as astronomers count days",
    "colFlux": "Flux",
    "colFluxWhat": "Brightness of the object",
    "colErr": "Err",
    "colErrWhat": "Uncertainty: how much the brightness could be off",
    "colFlag": "Flag",
    "colFlagWhat": "Marked when the measurement may be affected by a known problem",
    "chartSpectrumAria": "Spectrum: flux versus wavelength",
    "chartLightCurveAria": "Light curve: flux versus date",
    "axisWavelength": "Wavelength (µm)",
    "axisDate": "Date (MJD)",
    "axisFlux": "Flux (MJy/sr)",
    "tipFlagged": "⚑ flagged pixel in aperture",
    "tipSaturated": "⚑ star too bright (saturated): measured on its edges, relative brightness",
    "noPoints": "No measurements for this view. SPHEREx could not measure the object here (it may be outside or at the edge of the photos, or every pixel around it has a known problem).",
    "whatIs": "What is “{title}”?",
    "whatItDoes": "What it does",
    "whatYouSee": "What you will see",
    "learnMore": "Learn more:",
    "srSee": "What you will see:",
    "srTip": "Tip:",
    "stepOf": "Step {n} of {total}",
    "skipTour": "Skip tour",
    "tourBack": "Back",
    "tourNext": "Next",
    "tourDone": "Done",
    "glossarySubtitle": "Space words used in this viewer, in plain language",
    "searchLabel": "Search the glossary",
    "searchPlaceholder": "Search a word… (e.g. infrared)",
    "wordsCount": "{n} of {total} words",
    "noMatch": "No words match “{q}”.",
    "example": "Example:",
    "aboutTitle": "About SPHEREx",
    "aboutWhatTitle": "What it is",
    "aboutWhat1": "",
    "aboutWhatStrong": "SPHEREx",
    "aboutWhat2": " (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer) is a NASA space observatory designed to map the entire sky in spectrophotometric detail.",
    "aboutHowTitle": "How it captures images",
    "aboutHow1": "Unlike traditional imaging telescopes, SPHEREx captures infrared light across ",
    "aboutHowStrong": "102 distinct wavelengths",
    "aboutHow2": ". Using linear variable filters, it splits incoming light to obtain high-resolution optical spectrum data for every point on the celestial sphere, creating a comprehensive 3D map of the cosmos.",
    "aboutWhyTitle": "Why it does it",
    "aboutWhyOriginsB": "Cosmic Origins:",
    "aboutWhyOrigins": " Investigates the physics of cosmic inflation seconds after the Big Bang.",
    "aboutWhyGalaxiesB": "Galactic Evolution:",
    "aboutWhyGalaxies": " Measures light from distant galaxies to trace the history of cosmic star formation.",
    "aboutWhyLifeB": "Ingredients for Life:",
    "aboutWhyLife": " Searches for water ice and organic molecules in interstellar clouds and disk systems across the Milky Way.",
    "teamTitle": "About us",
    "teamSubtitle": "Team Athenas IV · NASA Space Apps Challenge 2026",
    "roleBackend": "Backend Dev",
    "roleDesigner": "Designer",
    "roleFrontend": "Frontend Dev"
  },
  "errors": {
    "BAD_PARAMS": "Some settings are not valid. Check the coordinates (Dec between −90 and +90) and the field of view (1 to 30).",
    "NO_COVERAGE": "SPHEREx has not photographed this spot of the sky yet.",
    "UPSTREAM_TIMEOUT": "The NASA archive is busy right now. Try again in a few seconds.",
    "INTERNAL": "Something went wrong on the server. Try again in a few seconds.",
    "NETWORK": "Cannot reach the server. Is the backend running?",
    "GAIA_UNAVAILABLE": "Gaia (ESA) is not responding right now. SPHEREx images work as usual."
  },
  "caption": {
    "title": "What am I looking at?",
    "diff1": "This picture is “{label}”: the newer date minus the older one.",
    "diff2": "Gray means nothing changed. A black spot shows where something was on the older date, and a white spot where it is on the newer one.",
    "frames1": "You are seeing a single photo taken on {date} UTC, with detector {det}.",
    "frames2": "Photo {n} of {total}. Single photos are noisier than the combined ones, but show more dates.",
    "blink1": "You are seeing this patch of sky as SPHEREx photographed it in {label} (date {n} of {total}), using {det}.",
    "playing": "The picture changes to the next date every {s} s: stars stay still, anything that jumps has moved.",
    "paused": "The animation is paused: use ◀ ▶ to compare the dates.",
    "oneDate": "There is only one date for this spot so far, so nothing can be compared yet.",
    "typedMarked": "The spot you typed is in the center, inside the orange circle.",
    "typed": "The spot you typed is in the center of the picture.",
    "whereMarked": "{name} is inside the orange circle in the center",
    "where": "{name} is in the center",
    "arrow": " The orange arrow shows where it is heading.",
    "brownDwarf": "{where}. It is a brown dwarf, a cold “failed star”, so it shines brightest in D5 and D6.{arrow}",
    "variable": "{where}. It is a variable star: compare its brightness between dates, or measure its light curve below.",
    "fast": "{where}. It moves {speed} arcseconds per year, one of the fastest in the sky: watch it shift between dates.{arrow}",
    "plain": "{where}.{arrow}",
    "det": {
      "D1": "D1, the infrared closest to visible red light",
      "D2": "D2, near infrared",
      "D3": "D3, near infrared",
      "D4": "D4, middle infrared",
      "D5": "D5, deep infrared, where cold objects shine the most",
      "D6": "D6, the deepest infrared SPHEREx sees",
      "ALL": "all six infrared detectors added together"
    }
  },
  "tours": {
    "viewer": {
      "sky": {
        "title": "This is the sky",
        "text": "A small patch of sky photographed by NASA’s SPHEREx telescope in infrared light. Drag to move around, scroll to zoom in and out."
      },
      "player": {
        "title": "Pictures from different dates",
        "text": "SPHEREx photographs the whole sky every six months. These controls play those dates like a flipbook: stars stay still and anything that moved seems to jump."
      },
      "caption": {
        "title": "What am I looking at?",
        "text": "This box always describes, in plain words, what is on screen right now and what to look for."
      },
      "recipes": {
        "title": "Quick recipes",
        "text": "Not sure where to start? Each recipe changes several settings at once for a common task, like spotting something that moves."
      },
      "mode": {
        "title": "Viewing mode",
        "text": "“Blink” animates the dates, “Single frames” shows each photo, and “Difference” subtracts two dates so only what changed stands out."
      },
      "detector": {
        "title": "Infrared “colors”",
        "text": "SPHEREx has six detectors, each sensitive to a different infrared color. Cold objects like brown dwarfs shine most in D5 and D6."
      },
      "photometry": {
        "title": "Measure the brightness",
        "text": "Measures how bright the object in the center is in every photo, to draw its spectrum (brightness by color) or its light curve (brightness over time)."
      },
      "help": {
        "title": "Help is everywhere",
        "text": "Hover any control, reach it with the Tab key, or tap its ⓘ icon to see what it does. The “Glossary” link explains every space word in simple terms."
      }
    },
    "explore": {
      "input": {
        "title": "Where do you want to look?",
        "text": "Type the position of a spot in the sky as two numbers separated by a space: first Right Ascension (RA, from 0 to 360), then Declination (Dec, from −90 to +90). Only numbers, + and − are accepted. Press Enter and the viewer opens with that spot in the center.",
        "exampleLabel": "Example",
        "example": "133.786245 -7.244373 is where the brown dwarf WISE 0855 is."
      },
      "examples": {
        "title": "Or pick a famous object",
        "text": "Don’t know any coordinates? These buttons already have them: each one opens the viewer centered on an object chosen by NASA for this challenge. Hover a button to see what it is and where it is."
      },
      "each": {
        "title": "What is each one?",
        "text": "Pick one depending on what you want to see:"
      },
      "help": {
        "title": "Help is always at hand",
        "text": "Hover anything with an ⓘ icon (or tap the icon on a phone) to see what it is for, in plain words. You can replay this tour any time with “How does this work?”."
      }
    }
  },
  "blurbs": {
    "barnard": "The star that moves fastest across our sky.",
    "epsindib": "A pair of brown dwarfs orbiting a nearby star.",
    "wise0855": "The coldest known brown dwarf: it visibly jumps between dates.",
    "rwaur": "A young star whose brightness changes irregularly.",
    "rdra": "A giant star that brightens and fades every 8 months."
  },
  "help": {
    "coordsInput": {
      "title": "Sky coordinates",
      "terms": [
        "sky-coordinates"
      ],
      "does": "Tells the viewer which spot of the sky to show. Astronomers use two numbers, a bit like latitude and longitude on Earth: Right Ascension (RA, from 0 to 360, going around the sky) and Declination (Dec, from −90 at the south pole of the sky to +90 at the north pole).",
      "see": "After pressing Enter you will see that patch of sky as photographed by SPHEREx, with the exact spot you typed in the center.",
      "tip": "Not sure what to type? Pick one of the examples below: each one is a famous object worth looking at."
    },
    "targets": {
      "title": "Example objects",
      "terms": [
        "brown-dwarf",
        "proper-motion"
      ],
      "does": "Opens the viewer on objects chosen by NASA for this challenge. Their positions are already corrected for how much they have moved in recent years.",
      "see": "Each button takes you straight to that object. Hover a button to see its coordinates.",
      "tip": "Start with WISE 0855: it is a cold “failed star” that moves so fast you can see it jump between images."
    },
    "coords": {
      "title": "Right ascension and declination",
      "terms": [
        "sky-coordinates"
      ],
      "does": "The position in the sky the viewer is centered on: first RA (0 to 360), then Dec (−90 to +90), in degrees, separated by a space.",
      "see": "Type new numbers and press Enter: the viewer jumps to that spot and downloads its images.",
      "tip": "The first visit to a new spot takes a while (the images are being downloaded). Going back to a spot you already visited is instant."
    },
    "fov": {
      "title": "Field of view",
      "terms": [
        "arcminute",
        "field-of-view"
      ],
      "does": "How big the piece of sky in the window is, measured in arcminutes. One arcminute is a tiny angle: the full Moon is about 30 arcminutes wide.",
      "see": "A small number zooms in on the object in the center. A big number shows a wider area with more stars around it.",
      "tip": "Use a bigger field for objects that move fast, so they do not leave the picture. Bigger fields take longer to load the first time."
    },
    "detector": {
      "title": "Detector (infrared “color”)",
      "terms": [
        "infrared",
        "detector",
        "wavelength"
      ],
      "does": "SPHEREx sees infrared light, which is invisible to our eyes. Its camera has six detectors (D1 to D6); each one sees a different range of infrared “colors”, from D1 (closest to visible red) to D6 (furthest away).",
      "see": "The same patch of sky can look very different in each detector: some objects are bright in one and almost invisible in another.",
      "tip": "Cold objects such as brown dwarfs shine most in D5 and D6. Ordinary stars look brighter in D1 to D3. “All” adds the six together: a cleaner image, but you lose the color information and it loads slower."
    },
    "mode": {
      "title": "Viewing mode",
      "terms": [
        "blink",
        "epoch",
        "difference"
      ],
      "does": "Chooses how the pictures taken on different dates are shown.",
      "see": "“Blink epochs” plays the sky like a flipbook, one picture every 6 months: stars stay still and anything that moved appears to jump. “Single frames” shows the individual photos one by one (more dates, but each one is noisier). “Difference” subtracts an old picture from a new one: everything that did not change turns gray, and something that moved shows up as a black-and-white pair.",
      "tip": "Looking for something that moves? Start with “Blink epochs”, then confirm it with “Difference”."
    },
    "diffEpochs": {
      "title": "Dates to compare",
      "terms": [
        "difference"
      ],
      "does": "In Difference mode, picks the two dates that are compared: picture B minus picture A.",
      "see": "Objects that got brighter look white, objects that got fainter look black. Something that moved leaves a black spot where it was (A) and a white spot where it is now (B).",
      "tip": "Choose dates far apart: the further apart, the more a moving object will have traveled."
    },
    "stretch": {
      "title": "Stretch (brightness scale)",
      "terms": [
        "stretch"
      ],
      "does": "Decides how the brightness measured by the telescope is turned into shades of gray on your screen.",
      "see": "“asinh” shows faint and bright things at the same time (recommended). “linear” keeps the true proportions: bright stars look right but faint things almost disappear. “zscale” boosts the dark background so the faintest objects pop out, while bright stars become white blobs.",
      "tip": "If you cannot see anything, try “zscale”. If everything looks washed out, go back to “asinh”."
    },
    "defaults": {
      "title": "Apply defaults",
      "does": "Puts every setting back to its starting value. The position in the sky does not change.",
      "see": "The viewer reloads with the recommended settings."
    },
    "blink": {
      "title": "Blink interval",
      "does": "How long each picture stays on screen before the next one appears, in milliseconds (1000 ms = 1 second).",
      "see": "Lower values make the animation faster; higher values give you more time to look at each picture.",
      "tip": "Between 300 and 600 ms is usually the easiest speed for spotting something that jumps."
    },
    "opacity": {
      "title": "SPHEREx opacity",
      "does": "How see-through the SPHEREx picture is on top of the background map.",
      "see": "At 100% you only see SPHEREx. Lower it to let the map from another telescope show through and compare both.",
      "tip": "Slide it back and forth quickly: anything that appears in one picture and not in the other is worth a closer look."
    },
    "background": {
      "title": "Background map",
      "terms": [
        "wise",
        "2mass"
      ],
      "does": "A map of the whole sky made by another telescope, shown under and around the SPHEREx picture.",
      "see": "“AllWISE” is an infrared map taken by NASA’s WISE satellite around 2010, so you can compare with SPHEREx 15 years later. “AllWISE W2” shows a single infrared color very close to D5 and D6. “2MASS” is an infrared map from 1997–2001: the longest time gap, perfect for seeing how far nearby stars have moved.",
      "tip": "It starts on “None”, showing only SPHEREx. Pick a map to compare SPHEREx with older pictures of the same spot."
    },
    "gaia": {
      "title": "Gaia stars",
      "terms": [
        "gaia",
        "brown-dwarf"
      ],
      "does": "Draws a blue circle around every star measured by ESA’s Gaia mission, the most precise map of stars ever made. Each circle is moved to where that star was on the date being shown.",
      "see": "Blue circles over the stars in the picture. They follow the stars as the animation plays.",
      "tip": "Something that moves and has no circle is interesting: it may be an object too faint or too cold for Gaia to see, like a brown dwarf."
    },
    "invert": {
      "title": "Invert pixel values",
      "does": "Swaps black and white in the SPHEREx picture.",
      "see": "Black stars on a white sky, like a photographic negative.",
      "tip": "Many people find faint dots easier to see this way. It is also better for printing."
    },
    "share": {
      "title": "Copy share link",
      "does": "Copies a web address that opens exactly this view: the same spot of the sky and the same settings.",
      "see": "The button says “Link copied!”. Paste the link in a message, an email or a web page.",
      "tip": "Found something interesting? Share the link so others can check it."
    },
    "frameQuality": {
      "title": "Picture quality",
      "terms": [
        "flagged-pixel",
        "pixel"
      ],
      "does": "Information about the single photo being shown, to know how much you can trust it.",
      "see": "“Coverage”: how much of the window this photo covers (less than 100% means the object fell near the edge of the camera). “Flagged pixels”: share of pixels with a known problem, such as a cosmic-ray hit. “Target flagged”: whether the exact center has one of those problems.",
      "tip": "If something only appears in a photo with problems, it is probably not real."
    },
    "dataSummary": {
      "title": "About this data",
      "terms": [
        "epoch",
        "stacking"
      ],
      "does": "A summary of what was found for this spot of the sky.",
      "see": "How many photos SPHEREx took here, grouped into “epochs” (each time SPHEREx scanned this area, about every 6 months), which data releases they come from, and how many Gaia stars are nearby."
    },
    "player": {
      "title": "Animation controls",
      "does": "Play or pause the animation and move between dates one by one.",
      "see": "The text shows which date (or photo) is on screen. Each dot is one date: click a dot to jump to it.",
      "tip": "Pause and use ◀ ▶ to compare two dates calmly. Keyboard: Tab to the buttons and press Enter."
    },
    "photometry": {
      "title": "Measure target flux",
      "terms": [
        "flux"
      ],
      "does": "Measures how bright the object in the center is in every photo SPHEREx took of it.",
      "see": "A chart with one dot per photo. Hollow dots are photos where the measurement may be affected by a known problem.",
      "tip": "This can take a few minutes the first time, because every photo has to be downloaded and measured."
    },
    "photViews": {
      "title": "Spectrum or light curve",
      "terms": [
        "spectrum",
        "light-curve",
        "variable-star"
      ],
      "does": "Shows the same measurements in two different ways.",
      "see": "“Spectrum”: brightness for each infrared color. Dips in the line are fingerprints of molecules such as water or methane, which is how scientists recognize cold brown dwarfs. “Light curve”: brightness over time, for one detector. A variable star like R Draconis goes up and down.",
      "tip": "For the light curve, pick the detector where the object is brightest."
    },
    "recipes": {
      "title": "Quick recipes",
      "does": "Ready-made settings for the most common things people come to do. One click changes several settings at once.",
      "see": "The viewer reloads with the settings of the recipe. You can still change anything afterwards.",
      "tip": "New here? “Spot something that moves” is a great first try."
    },
    "recipeMove": {
      "title": "Spot something that moves",
      "terms": [
        "blink",
        "proper-motion"
      ],
      "does": "Plays all the dates as an animation, using all six detectors added together for the cleanest picture.",
      "see": "A flipbook of the sky: stars stay put and anything that moved seems to jump from one place to another.",
      "tip": "Watch the orange circle in the center first, then look around it for anything else that jumps."
    },
    "recipeConfirm": {
      "title": "Confirm the movement",
      "terms": [
        "difference"
      ],
      "does": "Subtracts the first date from the last one, the two dates that are furthest apart.",
      "see": "A gray picture where anything that moved shows up as a black spot (where it was) next to a white spot (where it is now)."
    },
    "recipeCold": {
      "title": "Look for cold objects",
      "terms": [
        "brown-dwarf",
        "infrared"
      ],
      "does": "Switches to detector D5, the infrared “color” where cold objects such as brown dwarfs shine the most, and uses the WISE map at a similar color as background.",
      "see": "Ordinary stars look fainter than usual and cold objects stand out.",
      "tip": "Something bright here that does not have a blue Gaia circle could be a brown dwarf."
    },
    "recipeVariable": {
      "title": "Watch brightness change",
      "terms": [
        "variable-star",
        "light-curve"
      ],
      "does": "Uses a linear brightness scale, so changes in brightness are not hidden, and prepares the light curve chart.",
      "see": "In the animation, a variable star gets bigger and brighter or smaller and fainter. Press “Measure target flux” below to see its light curve."
    },
    "marker": {
      "title": "Mark the target",
      "terms": [
        "proper-motion"
      ],
      "does": "Draws an orange circle around the object at the center. For objects that move fast, an arrow shows where it is heading.",
      "see": "The arrow points to where the object will be in 10 years. The animation shows only a small part of that trip.",
      "tip": "Turn it off to look at the object without anything covering it."
    },
    "caption": {
      "title": "What am I looking at?",
      "does": "A short description of what is on screen right now, updated as you change the settings or the animation advances.",
      "see": "Which date and which infrared “color” you are looking at, and what to look for."
    },
    "tour": {
      "title": "Guided tour",
      "does": "A step-by-step walk through the viewer, pointing at each part and explaining what it is for.",
      "see": "A highlighted part of the screen with a short explanation. Use “Next” and “Back” to move, or “Skip” to leave at any time."
    },
    "glossary": {
      "title": "Glossary",
      "does": "Opens a list of the space words used in this viewer, explained in simple terms.",
      "see": "The glossary opens in a new tab, so you do not lose what you are looking at."
    }
  },
  "glossary": {
    "sky-coordinates": {
      "term": "Sky coordinates (RA and Dec)",
      "short": "Two numbers that say where something is in the sky, like latitude and longitude on Earth.",
      "text": "Imagine the sky as a giant ball around the Earth. Right Ascension (RA) goes around it, from 0 to 360 degrees, like longitude. Declination (Dec) goes from −90 at the south pole of the sky to +90 at the north pole, like latitude. Every star, galaxy or planet has its own pair of numbers.",
      "example": "WISE 0855 is at about RA 133.76, Dec −7.24."
    },
    "arcminute": {
      "term": "Degree, arcminute and arcsecond",
      "short": "Units for measuring sizes and distances in the sky.",
      "text": "Sizes in the sky are measured as angles. A full circle has 360 degrees; one degree is split into 60 arcminutes, and one arcminute into 60 arcseconds. They are tiny: an arcsecond is about the size of a coin seen from 4 kilometers away.",
      "example": "The full Moon is about 30 arcminutes (half a degree) wide."
    },
    "field-of-view": {
      "term": "Field of view",
      "short": "How much sky fits in the picture.",
      "text": "A small field of view is like zooming in with a camera: you see fewer things but bigger. A large one shows more sky around the object, which helps to follow objects that move a lot."
    },
    "infrared": {
      "term": "Infrared light",
      "short": "Light with colors “redder than red”, invisible to our eyes.",
      "text": "Light comes in many colors, and our eyes only see a small range of them. Beyond red there is infrared light: we cannot see it, but we can feel it as heat. Cold objects in space, like brown dwarfs or dust clouds, shine mostly in infrared, so infrared telescopes such as SPHEREx can find things that ordinary telescopes miss.",
      "example": "A TV remote control talks to the TV using infrared light."
    },
    "wavelength": {
      "term": "Wavelength (µm)",
      "short": "The number that identifies each color of light.",
      "text": "Each color of light has a wavelength. Infrared wavelengths are measured in micrometers (µm), thousandths of a millimeter. Visible red light is about 0.7 µm; SPHEREx sees from 0.75 to 5 µm."
    },
    "detector": {
      "term": "Detector",
      "short": "The part of the camera that captures the light; SPHEREx has six, one for each range of infrared colors.",
      "text": "SPHEREx splits the infrared light into six ranges and has one detector for each: D1 sees the infrared colors closest to visible red, D6 the furthest away. Looking at the same object in different detectors tells us what it is made of and how hot it is."
    },
    "spherex": {
      "term": "SPHEREx",
      "short": "A NASA space telescope that maps the whole sky in 102 infrared colors.",
      "text": "SPHEREx was launched in 2025. Every six months it photographs the entire sky, so it is perfect for finding things that move or change. Its main goals are to study how the universe began, how galaxies formed, and where the water and ice of planets come from."
    },
    "epoch": {
      "term": "Epoch",
      "short": "One of the times SPHEREx photographed a patch of sky.",
      "text": "SPHEREx goes back to the same patch of sky about every six months. Each of those visits is an epoch. Comparing epochs is how you discover what moved or changed. Near the poles of the sky SPHEREx looks almost all the time, so there the epochs are grouped by month."
    },
    "blink": {
      "term": "Blinking",
      "short": "Showing pictures of the same place taken on different dates, one after another.",
      "text": "It is the oldest trick for discovering moving objects: when you switch quickly between two pictures, the stars stay still and anything that moved seems to jump. Pluto was discovered this way in 1930, and volunteers still use it today to find new objects."
    },
    "difference": {
      "term": "Difference image",
      "short": "A picture made by subtracting an older picture from a newer one.",
      "text": "If nothing changed, everything cancels out and becomes gray. If an object moved, it leaves a black spot where it was and a white spot where it is now. If an object got brighter it looks white; fainter, black."
    },
    "frame": {
      "term": "Frame",
      "short": "One single photo taken by SPHEREx.",
      "text": "Every time SPHEREx points somewhere it takes a photo with each of its six detectors; each of those photos is a frame. Frame names start with the year and week the photo was taken and end with the detector.",
      "example": "2026W39_1A_0276_1_D3 was taken in week 39 of 2026 with detector D3."
    },
    "mjd": {
      "term": "MJD (Modified Julian Date)",
      "short": "A way of writing dates as a single number of days.",
      "text": "Instead of day, month and year, astronomers count days one after another. That makes it easy to know how much time passed between two photos: just subtract the numbers. The decimals are the time of day.",
      "example": "MJD 61305 is 21 September 2026; MJD 61305.5 is noon that same day."
    },
    "uncertainty": {
      "term": "Uncertainty (error)",
      "short": "How much a measurement could be off.",
      "text": "No measurement is perfect: there is always some noise. The uncertainty says how far the true value could reasonably be from the measured one. In the charts it is drawn as a small vertical line through each dot (an “error bar”).",
      "example": "A flux of 1.52 ± 0.03 means the true value is very likely between 1.49 and 1.55."
    },
    "stacking": {
      "term": "Stacking",
      "short": "Adding several pictures of the same place to get a cleaner one.",
      "text": "Each single photo has some random noise, like the grain of a photo taken at night. Averaging many photos of the same spot cancels the noise and makes faint objects visible. In this viewer, each epoch is a stack of up to 24 photos."
    },
    "stretch": {
      "term": "Stretch",
      "short": "How the brightness measured by the telescope is turned into shades of gray.",
      "text": "The sky has extremely faint and extremely bright things side by side, much more contrast than a screen can show. A stretch chooses how to squeeze that range into black-to-white so you can see what interests you."
    },
    "pixel": {
      "term": "Pixel",
      "short": "Each tiny square of a digital picture.",
      "text": "Each SPHEREx pixel covers about 6 arcseconds of sky. A star usually covers one or two pixels, so in these pictures stars look like small squares."
    },
    "flagged-pixel": {
      "term": "Flagged pixel",
      "short": "A pixel with a known problem that should not be trusted.",
      "text": "Sometimes a pixel is wrong: a cosmic ray (a particle from space) hit the camera, the pixel is damaged, or a very bright star nearby spilled light. The SPHEREx team marks those pixels so they can be ignored. This viewer hides them before building the images."
    },
    "brown-dwarf": {
      "term": "Brown dwarf",
      "short": "A “failed star”: too big to be a planet, too small to shine like a star.",
      "text": "Brown dwarfs are balls of gas that never got hot enough to burn like the Sun. They are cold and faint, so they glow mostly in infrared. Many of the nearest ones were discovered by volunteers comparing infrared pictures.",
      "example": "WISE 0855 is the coldest known brown dwarf: about −25 °C, colder than a freezer."
    },
    "proper-motion": {
      "term": "Proper motion",
      "short": "How fast a star moves across the sky, as seen from Earth.",
      "text": "All stars move, but most are so far away that they seem fixed. Nearby stars shift a little every year. The closer and faster a star is, the bigger its proper motion. It is measured in arcseconds per year.",
      "example": "Barnard’s Star moves about 10 arcseconds per year: in 180 years it travels the width of the full Moon."
    },
    "variable-star": {
      "term": "Variable star",
      "short": "A star whose brightness changes over time.",
      "text": "Some stars swell and shrink, others are surrounded by dust that comes and goes, or have a companion that blocks their light. Measuring their brightness on many dates (a light curve) reveals how they change.",
      "example": "R Draconis gets brighter and fainter every 245 days."
    },
    "flux": {
      "term": "Flux (brightness)",
      "short": "How much light arrives from an object; how bright it looks.",
      "text": "In this viewer, flux is measured in MJy/sr, a unit astronomers use for the brightness of each bit of sky. You do not need the unit to compare: a higher number simply means brighter."
    },
    "spectrum": {
      "term": "Spectrum",
      "short": "How bright an object is in each color of light.",
      "text": "Splitting light into its colors reveals what an object is made of: each molecule absorbs some specific colors and leaves “dips” in the spectrum, like a fingerprint. Water and methane leave clear dips in the spectrum of cold brown dwarfs."
    },
    "light-curve": {
      "term": "Light curve",
      "short": "How the brightness of an object changes over time.",
      "text": "A chart with the date on one axis and the brightness on the other. A flat line means the object does not change; ups and downs mean it is variable."
    },
    "gaia": {
      "term": "Gaia",
      "short": "A European space telescope that measured the positions of almost 2 billion stars.",
      "text": "Gaia measured where each star is and how it moves with incredible precision. This viewer draws Gaia stars as blue circles and moves each one to where it was on the date being shown. Gaia sees visible light, so very cold objects like brown dwarfs are usually missing from it."
    },
    "wise": {
      "term": "WISE and AllWISE",
      "short": "A NASA infrared space telescope that mapped the whole sky around 2010.",
      "text": "WISE photographed the whole sky in four infrared colors; AllWISE is the combined map. Comparing it with SPHEREx, taken about 15 years later, shows how nearby objects have moved."
    },
    "2mass": {
      "term": "2MASS",
      "short": "An infrared map of the whole sky made from two ground telescopes between 1997 and 2001.",
      "text": "Because it is about 25 years older than SPHEREx, it is great for seeing how far nearby stars have moved in that time."
    },
    "zodiacal-light": {
      "term": "Zodiacal light",
      "short": "A faint glow from dust in our own Solar System.",
      "text": "Tiny dust grains between the planets reflect sunlight and glow in infrared. That glow covers the whole sky like a fog. SPHEREx models it and this viewer subtracts it, so the stars and galaxies stand out."
    }
  }
}
