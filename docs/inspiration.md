# Inspiration

A running log of references for the whoami rebuild. Each entry records what
is actually there (measured colours where possible) and the first read on
why it lands. Distillation comes later — see **Threads** at the bottom.

## Entries

### Holy Mountain × Cellarmaker shirt

Screen-printed tee: a hot-pink skull with hypnotic spiral eyes, crowned by hop
leaves and cones, inside an arched frame on a dark shirt. The sleeve carries a
geometric triangle-and-keyhole mark.

- Palette, sampled from the photo (approximate): fluorescent magenta `#FB5FEA`,
  pale lime `#EFF6B2`, slate-navy ground `#3A3C4E`.
- Two inks only. Magenta and green are complements, so the pairing vibrates.
- Fluorescent inks sit outside sRGB. On screen, this is a P3 colour.

### Draggable — shopify.github.io/draggable

- Electric-blue ground, yellow wordmark, chunky isometric blocks with thick
  black outlines.
- Candy set pulled from the page: lilac `#CA8CFF`, coral `#FF576F`, violet
  `#B762FF`, mint `#4EE4C4`, green `#44ED93`, sky `#57B8FF`.
- The interaction is the demo. Picking things up and moving them is the whole
  pitch.

### Turnstyle — turnstyle.studio

- Black ground, large grey statement type with key words picked out in white.
  A live date, time and weather readout sits in the corner.
- Signature accent is `#3C00FF`, used in the page-transition overlay and the
  loading bar. Found in the CSS rather than seen static on the homepage.
- `#3C00FF` has zero green and full blue, so it sits at the very edge of sRGB.
  That is why it "pops on any screen": it is as saturated as sRGB can go.

### Gruvbox (dark)

- Warm, retro, low-glare. Ground `#282828`, foreground `#EBDBB2`.
- Brights: red `#FB4934`, green `#B8BB26`, yellow `#FABD2F`, blue `#83A598`,
  purple `#D3869B`, aqua `#8EC07C`, orange `#FE8019`.
- Saturated accents that stay comfortable because everything is pulled warm
  and slightly earthy.

### Dia — diabrowser.com

- Marketing site: black ground, serif wordmark, white pill nav, cinematic
  photography ("Watch the scream").
- The built-in pages you mentioned, like the week recap, aren't visible from
  the public site. **A screenshot of the week recap would be worth adding
  here.**

### Dave Arcade — davearcade.com

- Illustrator's portfolio: cream ground, red roundel logo, dense maximalist
  illustration with heavy black line.
- Nineties arcade and streetwear energy in coral red, teal, sky blue and
  yellow. The work is the interface. Chrome is minimal and gets out of the way.

### Pest Stop Boys — peststopboys.co.uk

- A pest-control company with a wildly unserious site: cobalt blue, a jungle
  of organic shapes in pink, green, navy and red-orange, and huge white type.
- A wave reveal carries the line "this website contains bugs". Humour does the
  branding.

### Graddis — graddis.org

- A warm paper ground with translucent WebGL jellyfish drifting slowly in soft
  blues, peach and rust. A "Scenes" picker implies more than one sketch.
- The quiet outlier on this list. It is ambient rather than loud, and the
  whole page is the piece.

### TypeSafe AI — typesafe.ai

Marketing site for Jev, their "System One" model. Added 2026-09-25.

- White ground with huge dithered magenta-pink fields that bleed in from the
  edges like clouds or spilled ink. The dither is a raster image, not a shader
  or canvas — there is no `<canvas>` on the page.
- Pink sampled from the DOM at `#F386A1`; links use `#0000EE`, the browser's
  default blue, clearly on purpose.
- Type does a lot of the work: `Die Grotesk` for display, `LisaTerminal Paper`
  and `JetBrains Mono` for chrome. A bitmap terminal face against a clean
  grotesque.
- The middle of the page is a field of draggable retro windows with title bars
  — a working clock, Game of Life, a Glider — laid out as a family tree of
  model lineage (LM to RLHF to RLCD). The diagram *is* the interface.
- Built in Framer. Its `color(display-p3 1 1 1)` occurrences are Framer's
  `@supports` feature probe, not a wide-gamut palette.

Why it lands, given the rest of this log: a restrained ground with one
saturated colour doing all the work, and personality carried by playful,
manipulable objects rather than decoration. Magenta again, for the third time
here.

**Christian's note:** the appeal is the consistency and the commitment to a
theme, not any specific motif. Nothing here to borrow directly.

## Direction

**Decided 2026-10-04: palette B, petrol and ochre.** Chosen for how it reads in
both themes and for the Pacific Northwest associations it carries.

**Hero, early thinking:** a more vibrant, popping green rather than a contrasting
hue — the pop coming from chroma within the same family, not from a complement.
At petrol's hue P3 allows about 35% more chroma than sRGB at every lightness, so
a bright hero green from this family is exactly where P3 pays off. That sits
alongside the magenta hypothesis below rather than replacing it, until the hero
exists.

### The hero: a tidal network (2026-10-10)

**The idea.** Trees, neurons and machine-learning networks all branch the same
way — and so do tides. Water draining off a mudflat carves branching channels
that look like roots or dendrites from above. So the tide is not a number
steering a picture of a tree; it is the thing that fills the branches.

**Christian's own reference**, and the best one on this page: standing at the
edge of a low tide at Carkeek Park, Golden Gardens and Ruby Beach, watching the
water line recede over moist sand full of tiny life, with a web of foamy
brackish water sloshing back to the sea in branches.

**Satellite references** (Esri World Imagery, plus images Christian supplied):

- *Stillaguamish delta, Port Susan Bay* — thousands of fine, near-parallel
  rills converging into trunks. Silvery water on dark grey-green mud.
- *Skagit delta* — the reverse: one river fanning out toward the sea.
- *Nisqually delta* — big looping meanders, channels flaring into funnels at
  the sound, dark water on pale olive marsh, purple-brown mudflats.
- *Pipers Creek at Carkeek Park* — the small scale: strands that split and
  rejoin (braiding), and a soft damp halo far wider than the water.

**Decisions so far.** Calm and ambient rather than reactive. Full-viewport.
WebGL first, WebGPU optional later. Three prototypes were built at
`/design/hero`; **C, "Terrain", is the base**. A (a baked channel network) and
B (glowing filaments) were "a little too much".

**What C is.** A plateau with channels cut at three scales — trunks, branches,
rills — each shallower than the last, so they flood in that order. Vivid green
only in shallow water, magenta streaks drifting with the flow, a faint dry web
showing where the tide has not yet reached. Driven by real NOAA predictions
for Seattle.

**Update, 2026-10-11.** C gave way to E, "Topo". The whole view is now a
contour map of a watershed built from the same branching network, and the tide
floods it valley by valley. It is drawn flat: stepped bands of water, one thin
line at the edge, no glow. Magenta marks the ground only the highest and lowest
tides reach. The name is drawn in the canvas so it can change ink where the
water crosses it. A to D are still on the page for comparison.

**Open:** layout of the name against the map; whether high tide is too nearly
all water; how much of the text work can move to the GPU.

### Earlier notes (2026-09-20)

Palette **B — petrol and ochre** is edging ahead. It reads well in both themes,
it is less common than an indigo or an oxblood, and it points at a possible
organising theme for the site: **Pacific Northwest**.

Worth noting the references already lean that way. Holy Mountain is a Seattle
brewery, Turnstyle is a Seattle studio, and the palette's own hues — wet cedar,
lichen, moss, weathered petrol — are PNW materials. The muted, near-monochrome
base also matches how the light here actually behaves: overcast, low contrast,
a narrow range punctuated by something vivid.

**The risk is cliché.** PNW visual language is heavily worked in Seattle —
mountain line art, evergreen silhouettes, topographic contours, the outfitter
look. The escape route is already in this log: the playfulness of Pest Stop
Boys and Dave Arcade, and the irreverence of the Holy Mountain skull. Material
and atmosphere, not landmarks.

**One hero hypothesis worth testing:** the shirt pairs fluorescent magenta with
pale lime on slate. Magenta is roughly the complement of B's petrol, so a
single magenta pop against a petrol-tinted near-black would echo both the
shirt and the palette — and magenta is exactly where P3 earns its place.

## Threads

First read only. These are for you to confirm or throw out.

- **One maximal pop against a controlled ground.** The shirt's magenta on
  slate, Turnstyle's `#3C00FF` on black, Gruvbox's brights on warm grey. The
  pop works *because* everything around it is restrained. This fits the plan
  of a quiet document palette with an expressive hero.
- **The loud colours live at the gamut edge.** Fluorescent magenta and
  `#3C00FF` are both saturated as far as sRGB allows, or beyond it. That makes
  a strong case for using P3 in the hero.
- **Personality through play.** Draggable's objects you can grab, Pest Stop
  Boys' jokes, Dave Arcade's characters, the skull's spiral eyes. Humour and
  interaction are doing the branding, not decoration.
- **Two moods, not one.** Most of the list is loud and graphic. Graddis is
  soft and ambient. The hero probably commits to one of these, and that
  choice matters more than the exact colours.
- **Commitment, not novelty.** Almost nothing on this list is here for a
  motif worth copying. What they share is a theme carried all the way
  through — TypeSafe's retro-computing world, Pest Stop Boys' jungle, Dave
  Arcade's characters, Gruvbox's one material. Half-committing is what reads
  as generic, not the absence of a good idea.
- **Loose palette tie-ins.** Palette A's indigo is a muted relative of
  Turnstyle's `#3C00FF`, and palette C's warmth sits closest to Gruvbox. B's
  petrol and ochre have no direct match on this list — the connection is to
  place rather than to any one reference. See Direction above.
