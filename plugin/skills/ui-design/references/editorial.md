# Editorial and Brand Surfaces - Frontend

Operational reference for editorial, brand, marketing, release, and docs home
pages. Product tool screens (dashboards, admin, CRUD, developer tools) keep the
product baseline in `canon.md` and `platforms.md`. Do not apply this file
to them.

The lineage here is modernist record-sleeve and identity design: Peter Saville,
Tomato, and the designers they drew on. It suits pages whose job is to present
one thing with character. It does not suit pages whose job is repeated work.

## Rules

1. Build the hero from one image or one typographic object. Keep the product
   name in `<title>`, the header, and the `h1`.
2. Use one display size and one body size. Separate them with white space, not
   extra weights or colours.
3. Align content asymmetrically to one modular grid, and use the same grid on
   every brand page.
4. Fix one element, such as the wordmark or a rule, in the same position on
   every page. Vary the layout around it.
5. Give each release, post, or artefact a stable catalogue number. Show it in
   the heading and the URL.
6. Base the visual system on a named historical reference. Use only licensed or
   public-domain material, and credit it on the page.
7. Distorted, layered, or oversized type is decoration. Hide it from assistive
   technology and repeat its meaning in readable text at 4.5:1 contrast. Never
   put `aria-hidden` inside a focusable element or on text that forms its name.
8. A colour code needs a visible key or text equivalent. Motion longer than
   five seconds needs a pause control and a reduced-motion fallback.

## Accessibility and Legal Conflicts

| Move | Failure | Keep the idea this way |
| --- | --- | --- |
| Leave the name off the hero | Wayfinding, and 2.4.2 Page Titled in spirit | Name stays in `<title>`, header wordmark with alt text, and `h1`. The `h1` may sit below an image-only hero. |
| Colour-coded text | 1.4.1 Use of Colour, 1.4.3 Contrast | Mark the code `aria-hidden` and put the real text nearby. Text 4.5:1, graphics 3:1 (1.4.11). |
| Type as texture | 1.4.5 Images of Text | Decorative only. Duplicate any meaning in real text. |
| Type scaled past the viewport | 1.4.10 Reflow | Size with `clamp()` that includes a rem term, such as `clamp(2.5rem, 1rem + 6vw, 8rem)`. Check 200% zoom (1.4.4 Resize Text) and no horizontal scroll at 320 CSS px. |
| Kinetic type | 2.2.2 Pause, 2.3.1 Three Flashes, 2.3.3 Animation from Interactions (AAA, best practice) | Pause control past five seconds. No more than three flashes per second. Honour `prefers-reduced-motion`. |
| Illegible display faces | Legibility of navigation and labels | Display use only. Never body text, navigation, or labels. |
| Appropriated imagery | Copyright | Licensed or public-domain sources, credited on the page. |

## Sources and What Each Contributes

- Peter Saville (Factory Records, New Order, Joy Division). The cover is one
  image or one typographic object. He quoted historical sources: Tschichold for
  the FAC 1 poster, Depero for the _Movement_ sleeve, Fantin-Latour for _Power,
  Corruption & Lies_. The colour code encoded the catalogue number on
  _PCL_, and the catalogue number, title, and band name on _Blue Monday_. The
  key was printed on the _PCL_ back sleeve. Factory's
  FAC numbers are the model for rule 5.
  https://designmuseum.org/designers/peter-saville
  https://www.dezeen.com/2021/10/11/factory-records-sleeves-peter-saville-interview/
- Tomato (Underworld, _dubnobasswithmyheadman_, _Trainspotting_ titles). Work
  credited to the collective. Text used as visual material and texture. Process
  material (drafts, distortion, versions) shown as part of the work. Principles
  here come from secondary sources, not a Tomato statement.
  https://tomato.co.uk
  https://www.itsnicethat.com/features/tomato-richard-turley-guest-edit-graphic-design-150822
  Books: _mmm...skyscraper i love you_ (1994), _Process: A Tomato Project_
  (1996).
- Massimo Vignelli, _The Vignelli Canon_. One or two type sizes, weight
  assigned by function, few typefaces, and white space as the main contrast.
  https://www.rit.edu/vignellicenter/sites/rit.edu.vignellicenter/files/documents/The%20Vignelli%20Canon.pdf
- Jan Tschichold, _The New Typography_. Asymmetric, left-aligned composition.
  Form follows the function of each text element.
  https://www.ucpress.edu/book/9780520250123/the-new-typography
- Wim Crouwel. One modular grid across the Stedelijk identity from 1963 to
  1985, so every poster read as part of one series.
  https://www.stedelijk.nl/en/exhibitions/wim-crouwel
- Otl Aicher, Munich 1972. Pictograms built on one construction grid and a
  restricted, named palette.
  https://www.smithsonianmag.com/innovation/this-graphic-artists-olympic-pictograms-changed-urban-design-forever-180978256/
- Experimental Jetset. A system needs some inflexibility: the Whitney identity
  locks the name's position and flexes everything else. Model for rule 4.
  https://www.jetset.nl/archive/whitney-museum-identity
  https://www.jetset.nl/archive/helveticanism

Visual references only, with no published principles to cite: The Designers
Republic (https://www.thedesignersrepublic.com/), Build
(https://studio.build/), Why Not Associates (https://whynotassociates.com/).
