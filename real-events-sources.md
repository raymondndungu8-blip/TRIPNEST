# TripNest verified events research

Research date: 16 August 2026 (Africa/Nairobi). The catalogue below uses events listed as upcoming or current by the cited sources at the time of research. Images were downloaded from image-search results associated with the named event and stored locally under `public/images/events-real/` so the cards do not depend on third-party hotlinks.

| Event | Date | Venue | Source | Local image |
|---|---|---|---|---|
| Africa Food Show Kenya 2026 | 19–21 August 2026 | KICC, Nairobi | [KenyaBuzz events](https://kenyabuzz.com/events) | `events-real/africa-food-show-kenya-2026.jpg` |
| Driftwood Rugby 7s 2026 | 21–23 August 2026 | Mombasa Sports Club, Mombasa | [Nairobi Events Guide](https://nairobieventsguide.com/event/driftwood-rugby-7s-2026/) and [What’s On Mombasa](https://whats-on-mombasa.com/) | `events-real/driftwood-rugby-7s-2026.jpg` |
| Afrocoast Festival 2026 with Monaco Laurèn | 22 August 2026 | Wild Waters, Mombasa | [Nairobi Events Guide](https://nairobieventsguide.com/event/afrocoast-festival-2026/) | `events-real/afrocoast-festival-2026.jpg` |
| Redsan @ 30 | 29 August 2026 | Carnivore Gardens, Nairobi | [KenyaBuzz events](https://kenyabuzz.com/events) | `events-real/redsan-at-30-2026.jpg` |
| Mombasa International Show 2026 | 2–6 September 2026 | Mombasa Agricultural Showground, Mkomani | [Agricultural Society of Kenya 2026 calendar](https://ask.co.ke/calendar-of-events1/) | `events-real/mombasa-international-show-2026.jpg` |
| Nairobi International Trade Fair 2026 | 28 September–4 October 2026 | Jamhuri Park Showground, Nairobi | [Agricultural Society of Kenya 2026 calendar](https://ask.co.ke/calendar-of-events1/) | `events-real/nairobi-international-trade-fair-2026.jpg` |

The old demo records such as “Nairobi Night Run”, “Summertides Festival”, “Blankets & Wine Nairobi”, “Sauti Sol Live at KICC”, and “Nakuru Food & Wine Festival” were not retained because their current dates and corresponding imagery could not be verified from the sources used for this update.

## Visual quality control

A contact sheet was rendered and visually inspected before implementation. The six local assets are all non-empty, readable, and event-specific: Africa Food Show artwork, Afrocoast live-performance imagery, Driftwood 7s artwork with players and dates, Mombasa International Show artwork, a Nairobi trade-fair exhibition photograph, and Redsan @ 30 artwork with venue and date details.

The Nairobi Events Guide page was also opened in the browser and confirmed to expose event-specific image URLs and listings for Driftwood Rugby 7s 2026 and Afrocoast Festival 2026. KenyaBuzz and the Agricultural Society of Kenya calendar were used for the additional date and venue checks described above.

## Live verification

Deployment `dpl_Gc2V3EHZRNmNyExXPhjaGVn6jBQS` is READY and aliases `https://tripnest-puce.vercel.app`. The live `/events` page now lists Africa Food Show Kenya 2026, Driftwood Rugby 7s 2026, Afrocoast Festival 2026 with Monaco Laurèn, Redsan @ 30, Mombasa International Show 2026, and Nairobi International Trade Fair 2026. Each card exposes the matching `/images/events-real/...` artwork path, the researched venue, and the verified date.
