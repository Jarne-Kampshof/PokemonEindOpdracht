// Aantal Pokemon dat we in 1 keer zichtbaar maken tijdens scrollen.
const API_BATCH_GROOTTE = 30;
// Data in de browsercache is 24 uur geldig.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// We tonen alleen Pokemon tot en met dit Pokedex-nummer.
const MAX_POKEDEX_ID = 1025;
// De laadmelding blijft minimaal 1 seconde staan (rustiger voor het oog).
const MINIMALE_LAADTIJD_MS = 1000;

// Deze variabelen onthouden waar we zijn met laden en tonen.
let allePokemon = [];
let huidigeRenderIndex = 0;
let totaalPokemon = 0;
let aantalGeladen = 0;
let isBezigMetLaden = false;
let allesGeladen = false;

// Kleine hulpfunctie om even te wachten.
function wacht(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// Bouwt de afbeelding-link voor een Pokemon op basis van het id.
function artworkUrl(id) {
  return 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites/sprites/pokemon/other/official-artwork/' + id + '.png';
}

// Leest data uit de browsercache en controleert of die nog bruikbaar is.
function leesCache(cacheSleutel) {
  try {
    const rauweWaarde = localStorage.getItem(cacheSleutel);
    if (!rauweWaarde) {
      return null;
    }

    const parsed = JSON.parse(rauweWaarde);
    if (!parsed || !parsed.timestamp || !parsed.data) {
      localStorage.removeItem(cacheSleutel);
      return null;
    }

    if (Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(cacheSleutel);
      return null;
    }

    return parsed.data;
  } catch (error) {
    return null;
  }
}

function schrijfCache(cacheSleutel, data) {
  try {
    localStorage.setItem(cacheSleutel, JSON.stringify({
      timestamp: Date.now(),
      data: data,
    }));
  } catch (error) {
    // Is de cache vol? Dan gaan we gewoon verder zonder op te slaan.
  }
}

// Eerst uit cache lezen; alleen als het nodig is via internet ophalen.
async function fetchJsonMetCache(url) {
  const cacheSleutel = 'poke-cache:' + url;
  const bestaandeData = leesCache(cacheSleutel);

  if (bestaandeData) {
    return bestaandeData;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('API request mislukt met status ' + response.status);
  }

  const data = await response.json();
  schrijfCache(cacheSleutel, data);
  return data;
}

function renderPokemonKaarten(pokemons) {
  const grid = document.getElementById('pokemon-grid');
  const aantalAlInGrid = grid.children.length;

  // Voor elke Pokemon maken we een kaart die je kunt aanklikken.
  pokemons.forEach(function(pokemon, index) {
    const id = pokemon.url.split('/').filter(Boolean).pop();
    // Eerste 12 afbeeldingen meteen laden, de rest pas als ze bijna in beeld komen.
    const moetDirectLaden = (aantalAlInGrid + index) < 12;
    const laadType = moetDirectLaden ? 'eager' : 'lazy';

    const kaart = document.createElement('a');
    kaart.className = 'pokemon-card';
    kaart.href = 'detailpagina.html?id=' + id;
    kaart.innerHTML = '<span class="pokemon-nummer">#' + String(id).padStart(3, '0') + '</span>'
      + '<img loading="' + laadType + '" decoding="async" src="' + artworkUrl(id) + '" alt="' + pokemon.name + '" />'
      + '<span class="pokemon-naam">' + pokemon.name + '</span>';

    grid.appendChild(kaart);
  });
}

// Laat steeds een volgend stuk van de lijst zien terwijl je naar beneden scrolt.
async function laadVolgendeBatch() {
  if (isBezigMetLaden || allesGeladen) {
    return;
  }

  if (allePokemon.length === 0) {
    return;
  }

  isBezigMetLaden = true;
  const loading = document.getElementById('loading');

  const resterend = totaalPokemon - huidigeRenderIndex;
  const volgendeGroepGrootte = Math.min(API_BATCH_GROOTTE, resterend);
  const batch = allePokemon.slice(huidigeRenderIndex, huidigeRenderIndex + volgendeGroepGrootte);

  const laadStart = Date.now();
  loading.innerHTML = '<span class="laad-status"><span class="laad-icoon" aria-hidden="true"></span>Laden...</span>';
  loading.hidden = false;

  try {
    // Zet deze groep direct op het scherm.
    renderPokemonKaarten(batch);
    // Onthoud tot waar we nu zijn, zodat de volgende laadactie verder kan gaan.
    huidigeRenderIndex = huidigeRenderIndex + batch.length;
    aantalGeladen = huidigeRenderIndex;

    // Zodra er iets is geladen, tonen we het overzicht.
    document.getElementById('pokemon-grid').hidden = false;

    // Laat de laadmelding minimaal even staan, anders knippert het te snel.
    const resterendeLaadtijd = Math.max(0, MINIMALE_LAADTIJD_MS - (Date.now() - laadStart));
    if (resterendeLaadtijd > 0) {
      await wacht(resterendeLaadtijd);
    }

    // Als alles zichtbaar is, tonen we een eindmelding.
    if (aantalGeladen >= totaalPokemon || batch.length === 0) {
      allesGeladen = true;
      loading.textContent = 'Alle pokemon geladen';
    } else {
      // Anders verbergen we de laadmelding tot de volgende keer.
      loading.hidden = true;
    }
  } catch (error) {
    // Bij een fout laten we een duidelijke melding zien.
    loading.textContent = 'Kon pokemon niet laden. Controleer je internet en scroll opnieuw.';
    loading.hidden = false;
    console.error(error);
  } finally {
    // Zet deze status altijd terug, zodat opnieuw laden mogelijk blijft.
    isBezigMetLaden = false;
  }
}

// Start van de lijstpagina: haal 1 grote lijst op en toon daarna in stukken.
async function initialiseerLijst() {
  const loading = document.getElementById('loading');
  loading.innerHTML = '<span class="laad-status"><span class="laad-icoon" aria-hidden="true"></span>Laden...</span>';
  loading.hidden = false;

  try {
    // Haal in 1 keer alle namen en links op tot de ingestelde grens.
    const data = await fetchJsonMetCache('https://pokeapi.co/api/v2/pokemon?limit=' + MAX_POKEDEX_ID + '&offset=0');
    // Extra controle: toon alleen Pokemon binnen ons maximum-id.
    allePokemon = data.results.filter(function(pokemon) {
      const id = Number(pokemon.url.split('/').filter(Boolean).pop());
      return id <= MAX_POKEDEX_ID;
    });

    totaalPokemon = allePokemon.length;
    // Toon direct het eerste deel op het scherm.
    await laadVolgendeBatch();
  } catch (error) {
    // Gaat de eerste keer iets mis, toon dan een duidelijke melding.
    loading.textContent = 'Kon pokemon niet laden. Controleer je internet en vernieuw de pagina.';
    loading.hidden = false;
    console.error(error);
  }
}

// Regelt automatisch bijladen tijdens scrollen, met een reserve-oplossing als backup.
function startInfiniteScroll() {
  const sentinel = document.getElementById('scroll-sentinel');
  let observer = null;

  // Backup-check: als je bijna onderaan bent, laad dan ook een nieuwe groep.
  function checkBijnaOnderaan() {
    if (allesGeladen || isBezigMetLaden) {
      return;
    }

    // 220 laad hij batch
    const bijnaOnderaan = window.innerHeight + window.scrollY >= document.body.offsetHeight - 220;
    if (bijnaOnderaan) {
      laadVolgendeBatch();
    }
  }

  if ('IntersectionObserver' in window) {
    // Gebruik browser-hulp om te zien of het eindpunt in beeld komt.
    observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        // Zodra het eindpunt zichtbaar is, laden we de volgende groep.
        if (entry.isIntersecting) {
          laadVolgendeBatch();
        }
      });
    }, {
      // Kijk in het scherm zelf.
      root: null,
      // Start iets eerder met laden (220px voor de onderkant).
      rootMargin: '220px',
      // Trigger zodra een klein deel zichtbaar is.
      threshold: 0,
    });

    // Zet de kijker aan op het sentinel-element onderaan.
    observer.observe(sentinel);
  }

  window.addEventListener('scroll', checkBijnaOnderaan, { passive: true });
  window.addEventListener('resize', checkBijnaOnderaan);
  // Controleer meteen bij opstarten (handig op grote schermen).
  checkBijnaOnderaan();
}

// Eerst scroll-mechanisme klaarzetten, daarna de data inladen.
startInfiniteScroll();
initialiseerLijst();