# Inspiration

A running log of references for the whoami rebuild. Each entry notes what is
there (with measured colors where possible) and a first guess at why it works.
The Threads section at the bottom collects what they have in common.

## Entries

### Holy Mountain × Cellarmaker shirt

A screen-printed tee. A hot-pink skull with spiral eyes, crowned with hop
leaves and cones, sits inside an arched frame on a dark shirt. The sleeve has a
geometric triangle-and-keyhole mark.

- Palette, sampled from the photo (approximate): fluorescent magenta `#FB5FEA`,
  pale lime `#EFF6B2`, slate-navy ground `#3A3C4E`.
- Only two inks. Magenta and green are complements, so the pairing vibrates.
- Fluorescent inks are outside sRGB. On screen this would be a P3 color.

### Draggable (shopify.github.io/draggable)

- Electric-blue ground, yellow wordmark, chunky isometric blocks with thick
  black outlines.
- Colors pulled from the page: lilac `#CA8CFF`, coral `#FF576F`, violet
  `#B762FF`, mint `#4EE4C4`, green `#44ED93`, sky `#57B8FF`.
- The demo is the interaction. You pick things up and move them.

### Turnstyle (turnstyle.studio)

- Black ground with large gray statement type, and key words picked out in
  white. A live date, time and weather readout sits in the corner.
- The accent is `#3C00FF`, used in the page-transition overlay and the loading
  bar. It's in the CSS but isn't visible on the static homepage.
- `#3C00FF` has zero green and full blue, so it sits at the edge of sRGB. It is
  about as saturated as sRGB gets.

### Gruvbox (dark)

- Warm, retro, low-glare. Ground `#282828`, foreground `#EBDBB2`.
- Brights: red `#FB4934`, green `#B8BB26`, yellow `#FABD2F`, blue `#83A598`,
  purple `#D3869B`, aqua `#8EC07C`, orange `#FE8019`.
- The accents are saturated but comfortable, because everything is pulled warm
  and a little earthy.

### Dia (diabrowser.com)

- Marketing site: black ground, serif wordmark, white pill nav, cinematic
  photography ("Watch the scream").
- The built-in pages Christian mentioned, like the week recap, aren't on the
  public site. A screenshot of the week recap would be worth adding here.

### Dave Arcade (davearcade.com)

- Illustrator's portfolio: cream ground, red roundel logo, dense illustration
  with heavy black line.
- Nineties arcade and streetwear look in coral red, teal, sky blue and yellow.
  The site chrome is minimal, so the work fills the page.

### Pest Stop Boys (peststopboys.co.uk)

- A pest-control company with a very unserious site: cobalt blue, a jungle of
  organic shapes in pink, green, navy and red-orange, and huge white type.
- A wave reveal carries the line "this website contains bugs". The jokes are
  the brand.

### Graddis (graddis.org)

- A warm paper ground with translucent WebGL jellyfish drifting slowly in soft
  blues, peach and rust. A "Scenes" picker suggests there is more than one
  sketch.
- The only quiet, ambient site on this list. The whole page is the piece.

### TypeSafe AI (typesafe.ai)

Marketing site for Jev, their "System One" model. Added 2026-09-25.

- White ground with huge dithered magenta-pink fields that bleed in from the
  edges like clouds or spilled ink. The dither is a raster image. There is no
  `<canvas>` on the page.
- Pink sampled from the DOM at `#F386A1`. Links use `#0000EE`, the browser's
  default blue, which looks intentional.
- Type: `Die Grotesk` for display, `LisaTerminal Paper` and `JetBrains Mono` for
  chrome. A bitmap terminal face next to a clean grotesque.
- The middle of the page is a field of draggable retro windows with title bars
  (a working clock, Game of Life, a Glider), laid out as a family tree of model
  lineage (LM to RLHF to RLCD). The diagram is also the interface.
- Built in Framer. Its `color(display-p3 1 1 1)` occurrences are Framer's
  `@supports` feature probe and have nothing to do with a wide-gamut palette.

A restrained ground with one saturated color, and personality that comes from
objects you can play with. This is the third magenta on this list.

Christian's note: the appeal is the consistency and the commitment to a theme.
There is nothing here to borrow directly.

## Direction

### Palette (decided 2026-10-04)

Palette B, petrol and ochre. It reads well in both themes and goes with the
Pacific Northwest idea below.

### Hero, early thinking

A more vibrant green from the same family as the palette, so the pop comes from
chroma. At petrol's hue, P3 allows about 35% more chroma than sRGB at every
lightness, so a bright hero green is a good use of P3. The magenta idea below
is still open until the hero exists.

### The hero: a tidal network (2026-10-10)

Trees, neurons and machine-learning networks all branch the same way, and so do
tides. Water draining off a mudflat carves branching channels that look like
roots or dendrites from above. So the tide itself can fill the branches.

Christian's own reference is the best one here: standing at the edge of a low
tide at Carkeek Park, Golden Gardens and Ruby Beach, watching the water line
recede over moist sand full of tiny life, with a web of foamy brackish water
sloshing back to the sea in branches.

Satellite references (Esri World Imagery, plus images Christian supplied):

- Stillaguamish delta, Port Susan Bay: thousands of fine, near-parallel rills
  converging into trunks. Silvery water on dark gray-green mud.
- Skagit delta: the reverse, one river fanning out toward the sea.
- Nisqually delta: big looping meanders, channels flaring into funnels at the
  sound, dark water on pale olive marsh, purple-brown mudflats.
- Pipers Creek at Carkeek Park: the small scale. Strands that split and rejoin
  (braiding), and a soft damp halo far wider than the water.

Decisions so far: calm and ambient, full-viewport, WebGL first with WebGPU
optional later. Three prototypes were built at `/design/hero`, and C
("Terrain") was the first base. A (a baked channel network) and B (glowing
filaments) were "a little too much".

C is a plateau with channels cut at three scales (trunks, branches, rills),
each shallower than the last, so they flood in that order. It has vivid green
only in shallow water, magenta streaks drifting with the flow, and a faint dry
web where the tide has not reached yet. It runs on real NOAA predictions for
Seattle.

Update, 2026-10-11: C gave way to E ("Topo"). The whole view is now a contour
map of a watershed built from the same branching network, and the tide floods
it valley by valley. It is drawn flat: stepped bands of water, one thin line at
the edge, no glow. Magenta marks the ground only the highest and lowest tides
reach. The name is drawn in the canvas so it can change ink where the water
crosses it.

Update, 2026-11-08: the hero is the homepage now. A to D and the Island and
Hybrid text treatments are gone, and the name uses Split only. The map has to
look the same with or without text over it, so nothing is calmed or smoothed
near the name. Real NOAA elevation for Carkeek Park, a procedural layout
based on Carkeek, and hints after the South Sound inlets were all tried and
set aside. They are on the `hero-experiments` branch. The original terrain
stays, turned so the sea comes from the west.

Open: layout of the name against the map, whether high tide is too nearly all
water, and how much of the text work can move to the GPU.

### Earlier notes (2026-09-20)

Palette B (petrol and ochre) is edging ahead. It reads well in both themes and
is less common than an indigo or an oxblood. It also suggests a theme for the
site: the Pacific Northwest.

The references already lean that way. Holy Mountain is a Seattle brewery and
Turnstyle is a Seattle studio. The palette's hues (wet cedar, lichen, moss,
weathered petrol) are PNW materials. The muted, near-monochrome base matches
the light here too: overcast and low contrast, with the occasional vivid thing.

The risk is cliché. PNW visual language is heavily used in Seattle: mountain
line art, evergreen silhouettes, topographic contours, the outfitter look. The
playfulness of Pest Stop Boys and Dave Arcade and the irreverence of the Holy
Mountain skull are a way around it. Go for material and atmosphere and skip the
landmarks.

One hero idea to test: the shirt pairs fluorescent magenta with pale lime on
slate. Magenta is roughly the complement of B's petrol, so a single magenta pop
against a petrol-tinted near-black would echo both the shirt and the palette.
Magenta is also where P3 helps the most.

## Threads

A first read. These are for Christian to confirm or throw out.

- Most of these use one very saturated color against a restrained ground: the
  shirt's magenta on slate, Turnstyle's `#3C00FF` on black, Gruvbox's brights on
  warm gray. That fits the plan of a quiet document palette with an expressive
  hero.
- The loud colors sit at the edge of the gamut. Fluorescent magenta and
  `#3C00FF` are as saturated as sRGB allows, or more. That is a good argument
  for using P3 in the hero.
- Personality comes from play: Draggable's objects you can grab, Pest Stop Boys'
  jokes, Dave Arcade's characters, the skull's spiral eyes.
- There are two moods here. Most of the list is loud and graphic, and Graddis is
  soft and ambient. The hero will probably have to pick one.
- Almost nothing on this list is here for a motif worth copying. What they share
  is a theme carried all the way through, like TypeSafe's retro-computing world,
  Pest Stop Boys' jungle or Gruvbox's single material. Committing halfway is
  what would look generic.
- Loose palette tie-ins: palette A's indigo is a muted relative of Turnstyle's
  `#3C00FF`, and palette C's warmth is closest to Gruvbox. B's petrol and ochre
  have no direct match on this list. Their connection is to place. See
  Direction above.
