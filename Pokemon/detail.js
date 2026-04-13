const typeKleuren = {
  fire:     '#F08030',
  water:    '#6890F0',
  grass:    '#78C850',
  electric: '#F8D030',
  ice:      '#98D8D8',
  fighting: '#C03028',
  poison:   '#A040A0',
  ground:   '#E0C068',
  flying:   '#A890F0',
  psychic:  '#F85888',
  bug:      '#A8B820',
  rock:     '#B8A038',
  ghost:    '#705898',
  dragon:   '#7038F8',
  dark:     '#705848',
  steel:    '#B8B8D0',
  fairy:    '#EE99AC',
  normal:   '#A8A878',
};

const statsKleuren = {
  hp: '#FF0000',
  attack: '#F08030',
  defense: '#6890F0',
  'special-attack': '#78C850',
  'special-defense': '#F8D030',
  speed: '#98D8D8',
};

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Leest het Pokemon-nummer uit de URL, bijvoorbeeld detailpagina.html?id=25.
const urlParams = new URLSearchParams(window.location.search);
const pokemonId = parseInt(urlParams.get('id'));
// Bijvoorbeeld: staat er ?id=25, dan wordt pokemonId gelijk aan 25.

// Leest data uit de browsercache en controleert of het nog geldig is.
function leesCache(cacheSleutel) {
  try {
    // Probeer de opgeslagen tekst op te halen uit de browser.
    const rauweWaarde = localStorage.getItem(cacheSleutel);
    // Niets gevonden? Dan is er ook geen bruikbare cache.
    if (!rauweWaarde) {
      return null;
    }

    // Zet de tekst om naar echte data.
    const parsed = JSON.parse(rauweWaarde);
    // Mist er belangrijke info? Dan gooien we deze kapotte cache weg.
    if (!parsed || !parsed.timestamp || !parsed.data) {
      localStorage.removeItem(cacheSleutel);
      return null;
    }

    // Is de cache te oud? Dan weggooien en opnieuw van internet halen.
    if (Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(cacheSleutel);
      return null;
    }

    // Alles klopt: geef de opgeslagen data terug.
    return parsed.data;
  } catch (error) {
    // Gaat er iets fout bij lezen of omzetten? Dan doen we alsof er geen cache is.
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
    // Is de cache vol? Dan laten we de app gewoon verder werken.
  }
}

// Haalt data eerst uit cache en pas daarna via internet.
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

function haalPokemonIdUitUrl(url) {
  return url.split('/').filter(Boolean).pop();
}

// Loopt door alle stappen in de evolutieketen en verzamelt de namen.
function leesEvolutieNamen(chainNode, namen) {
  namen.push(chainNode.species.name);
  chainNode.evolves_to.forEach(function(volgende) {
    leesEvolutieNamen(volgende, namen);
  });
}

// Laadt de evolutieketen en toont die als klikbare links.
async function renderEvolutieChain(soortData) {
  const evolutieDiv = document.getElementById('pokemon-evolutie');
  evolutieDiv.innerHTML = '<strong>Evolutie:</strong> laden...';

  try {
    const evolutionData = await fetchJsonMetCache(soortData.evolution_chain.url);
    const evolutieNamen = [];
    leesEvolutieNamen(evolutionData.chain, evolutieNamen);

    // Voor elke naam zoeken we het juiste id, zodat de link naar de detailpagina werkt.
    const linksHtml = await Promise.all(evolutieNamen.map(async function(naam) {
      const pokemonData = await fetchJsonMetCache('https://pokeapi.co/api/v2/pokemon/' + naam);
      return '<a href="detailpagina.html?id=' + pokemonData.id + '">' + naam + '</a>';
    }));

    evolutieDiv.innerHTML = '<strong>Evolutie:</strong> ' + linksHtml.join(' -> ');
  } catch (error) {
    // Als dit niet lukt, laten we een nette fallback-tekst zien.
    evolutieDiv.innerHTML = '<strong>Evolutie:</strong> niet beschikbaar';
  }
}

// Vult alle onderdelen van de detailpagina voor 1 Pokemon.
async function laadDetailPagina(id) {
  const loading = document.getElementById('loading');
  const detail = document.getElementById('pokemon-detail');

  try {
    // Basisinformatie van de Pokemon en extra soortinformatie ophalen.
    const data = await fetchJsonMetCache(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const soortData = await fetchJsonMetCache(data.species.url);

    // Naam, nummer en afbeelding op de pagina zetten.
    document.getElementById('pokemon-id-naam').textContent = data.id + ' ' + data.name;
    document.getElementById('pokemon-image').src = data.sprites.other['official-artwork'].front_default;
    document.getElementById('pokemon-image').alt = data.name;
    document.getElementById('pokemon-image').loading = 'lazy';

    // Abilities tonen als gekleurde labels.
    const abilitiesDiv = document.getElementById('pokemon-abilities');
    abilitiesDiv.innerHTML = '<span style="display:block; margin-bottom:5px;">Abilities:</span>';
    data.abilities.forEach(function(a) {
      const span = document.createElement('span');
      span.textContent = a.ability.name;
      span.style.backgroundColor = '#5865A8';
      span.style.padding = '4px 10px';
      span.style.borderRadius = '10px';
      span.style.color = 'white';
      span.style.marginRight = '6px';
      abilitiesDiv.appendChild(span);
    });

    // Types tonen met hun typekleur.
    const typesDiv = document.getElementById('pokemon-types');
    typesDiv.innerHTML = '<span style="display:block; margin-bottom:5px;">Types:</span>';
    data.types.forEach(function(t) {
      const span = document.createElement('span');
      span.textContent = t.type.name;
      span.style.backgroundColor = typeKleuren[t.type.name];
      span.style.padding = '4px 10px';
      span.style.borderRadius = '10px';
      span.style.color = 'white';
      span.style.marginRight = '6px';
      typesDiv.appendChild(span);
    });

    // Stats tonen met een balk: hoe hoger de waarde, hoe breder de balk.
    const statsDiv = document.getElementById('pokemon-stats');
    statsDiv.innerHTML = '<span style="display:block; margin-bottom:5px;">Stats:</span>';
    data.stats.forEach(function(s) {
      const rij = document.createElement('div');
      rij.style.marginBottom = '6px';

      const label = document.createElement('span');
      label.textContent = s.stat.name + ': ' + s.base_stat;
      label.style.display = 'block';
      label.style.fontSize = '0.85rem';

      const track = document.createElement('div');
      track.style.backgroundColor = '#e0e0e0';
      track.style.borderRadius = '10px';
      track.style.height = '12px';
      track.style.width = '100%';

      const vulling = document.createElement('div');
      vulling.style.backgroundColor = statsKleuren[s.stat.name];
      vulling.style.borderRadius = '10px';
      vulling.style.height = '12px';
      vulling.style.width = (s.base_stat / 2) + '%';

      track.appendChild(vulling);
      rij.appendChild(label);
      rij.appendChild(track);
      statsDiv.appendChild(rij);
    });

    // Vorige/volgende knoppen uitschakelen aan de randen van de lijst.
    document.getElementById('btn-vorige').disabled = id <= 1;
    document.getElementById('btn-volgende').disabled = id >= 1025;

    // Evolutieketen onderaan tonen.
    await renderEvolutieChain(soortData);

    // Laden klaar: detail tonen en laadmelding verbergen.
    loading.hidden = true;
    detail.hidden = false;
  } catch (error) {
    // Bij fout tonen we een duidelijke melding.
    detail.hidden = true;
    loading.hidden = false;
    loading.textContent = 'Kon pokemon detail niet laden. Controleer je internet en probeer opnieuw.';
    console.error(error);
  }
}

// Klik op "vorige" opent de vorige Pokemon.
document.getElementById('btn-vorige').addEventListener('click', function() {
  window.location.href = 'detailpagina.html?id=' + (pokemonId - 1);
});

// Klik op "volgende" opent de volgende Pokemon.
document.getElementById('btn-volgende').addEventListener('click', function() {
  window.location.href = 'detailpagina.html?id=' + (pokemonId + 1);
});

// Alleen laden als er echt een geldig id in de URL staat.
if (pokemonId) {
  laadDetailPagina(pokemonId);
}