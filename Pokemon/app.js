const API_BATCH_GROOTTE = 30;

let huidigeBatchPagina = 1;
let huidigeLokalePagina = 1;
let huidigeResultaten = [];
let totaalPokemon = 0;

function aantalPerPagina() {
  const breedte = window.innerWidth;

    if (breedte <= 375) { // Updated breakpoint for phone
    return 5; // telefoon
  }
 
  if (breedte <= 768) {
    return 15; // tablet
  }

  return 30; // desktop
}

function renderLokalePagina() {
  const perPagina = aantalPerPagina();
  const start = (huidigeLokalePagina - 1) * perPagina;
  const einde = start + perPagina;
  const zichtbarePokemons = huidigeResultaten.slice(start, einde);

  const grid = document.getElementById('pokemon-grid');
  grid.innerHTML = '';

  zichtbarePokemons.forEach(function(pokemon) {
    const id = pokemon.url.split('/').filter(Boolean).pop();

    const kaart = document.createElement('a');
    kaart.className = 'pokemon-card';
    kaart.href = 'detailpagina.html?id=' + id;
    kaart.innerHTML = '<span class="pokemon-nummer">#' + String(id).padStart(3, '0') + '</span>'
      + '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png" alt="' + pokemon.name + '" />'
      + '<span class="pokemon-naam">' + pokemon.name + '</span>';

    grid.appendChild(kaart);
  });

  // Lokale pagina's zijn pagina's binnen de 30 pokemon van de huidige batch.
  const totaalLokalePaginas = Math.ceil(huidigeResultaten.length / perPagina);
  const totaalBatchPaginas = Math.ceil(totaalPokemon / API_BATCH_GROOTTE);
  const paginasPerBatch = API_BATCH_GROOTTE / perPagina;
  const huidigePagina = (huidigeBatchPagina - 1) * paginasPerBatch + huidigeLokalePagina;
  const totaalPaginas = Math.ceil(totaalPokemon / perPagina);

  document.getElementById('page-indicator').textContent =
    'Pagina ' + huidigePagina + '/' + totaalPaginas;

  const isEerstePagina = huidigeBatchPagina === 1 && huidigeLokalePagina === 1;
  document.getElementById('btn-prev').disabled = isEerstePagina;

  const isLaatsteBatch = huidigeBatchPagina === totaalBatchPaginas;
  const isLaatsteLokalePagina = huidigeLokalePagina === totaalLokalePaginas;
  document.getElementById('btn-next').disabled = isLaatsteBatch && isLaatsteLokalePagina;
}

async function laadBatch(batchPagina) {
  const offset = (batchPagina - 1) * API_BATCH_GROOTTE;
  const loading = document.getElementById('loading');

  loading.textContent = 'Laden...';
  loading.hidden = false;

  try {
    // 1 call: per keer halen we altijd 30 pokemon op.
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=30&offset=' + offset);
    if (!response.ok) {
      throw new Error('API request mislukt met status ' + response.status);
    }

    const data = await response.json();

    huidigeResultaten = data.results;
    totaalPokemon = data.count;
    huidigeBatchPagina = batchPagina;
    huidigeLokalePagina = 1;

    renderLokalePagina();

    loading.hidden = true;
    document.getElementById('pokemon-grid').hidden = false;
    document.getElementById('pagination').hidden = false;
  } catch (error) {
    // Laat bestaande kaarten staan als een volgende batch faalt.
    if (huidigeResultaten.length > 0) {
      loading.textContent = 'Kon de volgende pagina niet laden. Controleer je internet en probeer opnieuw.';
      loading.hidden = false;
      document.getElementById('pokemon-grid').hidden = false;
      document.getElementById('pagination').hidden = false;
    } else {
      loading.textContent = 'Kon geen Pokemon laden. Controleer je internet en probeer opnieuw.';
      loading.hidden = false;
    }

    console.error(error);
  }
}

async function volgendePagina() {
  const totaalLokalePaginas = Math.ceil(huidigeResultaten.length / aantalPerPagina());
  const totaalBatchPaginas = Math.ceil(totaalPokemon / API_BATCH_GROOTTE);

  if (huidigeLokalePagina < totaalLokalePaginas) {
    huidigeLokalePagina = huidigeLokalePagina + 1;
    renderLokalePagina(); // Geen nieuwe API-call nodig.
    return;
  }

  if (huidigeBatchPagina < totaalBatchPaginas) {
    await laadBatch(huidigeBatchPagina + 1); // Pas hier doen we weer 1 call.
  }
}

async function vorigePagina() {
  if (huidigeLokalePagina > 1) {
    huidigeLokalePagina = huidigeLokalePagina - 1;
    renderLokalePagina(); // Geen nieuwe API-call nodig.
    return;
  }

  if (huidigeBatchPagina > 1) {
    await laadBatch(huidigeBatchPagina - 1); // 1 call naar de vorige batch.
    huidigeLokalePagina = Math.ceil(huidigeResultaten.length / aantalPerPagina());
    renderLokalePagina();
  }
}

document.getElementById('btn-prev').addEventListener('click', function() {
  vorigePagina();
});

document.getElementById('btn-next').addEventListener('click', function() {
  volgendePagina();
});

// Bij resize herberekenen we alleen de lokale pagina-indeling, zonder nieuwe fetch.
window.addEventListener('resize', function() {
  if (huidigeResultaten.length === 0) {
    return;
  }

  const maxLokalePagina = Math.max(1, Math.ceil(huidigeResultaten.length / aantalPerPagina()));
  if (huidigeLokalePagina > maxLokalePagina) {
    huidigeLokalePagina = maxLokalePagina;
  }

  renderLokalePagina();
});

laadBatch(1);