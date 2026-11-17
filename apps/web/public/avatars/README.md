# INK TAG avatars

Files: `A/{character}-{state}.svg` (13 characters × 8 states, Direction A).

Characters: otter cat frog bunny bear fox penguin axolotl ghosty duck dino octopus buddy

States: idle run1 run2 it stunned ghost shield frozen

viewBox `"-8 -10 80 80"`; the body center (circle hitbox center) is at (32,36), and the body radius is about 21 units.

To draw at hitbox radius R px, render the SVG at `size = R/21*80` px, with its top-left at `(cx - (40/80)*size, cy - (46/80)*size)`.

Strokes use `vector-effect="non-scaling-stroke"` so they stay 1.5px at any size.

Style A also needs a CSS shadow: `drop-shadow(0 2px 0 rgba(29,29,31,.10))`.

Run cycle: alternate run1/run2 about every 120ms while moving, and mirror with `scaleX(-1)` when moving left.
