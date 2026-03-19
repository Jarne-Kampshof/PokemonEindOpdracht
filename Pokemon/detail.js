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

const urlParams = new URLSearchParams(window.location.search);
const pokemonId = parseInt(urlParams.get('id'));
// id uit url halen

async function laadDetailPagina(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await response.json();
  // data uit api halen
  
  document.getElementById('pokemon-id-naam').textContent = data.id + ' ' + data.name;
  document.getElementById('pokemon-image').src = data.sprites.other['official-artwork'].front_default;
  document.getElementById('pokemon-image').alt = data.name;
  
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
  // data op pagina zetten
  
  document.getElementById('btn-vorige').disabled = id <= 1;
  document.getElementById('btn-volgende').disabled = id >= 1025;
  // knoppen werken niet bij eerste en laatste pagina
  
  document.getElementById('loading').hidden = true;
  document.getElementById('pokemon-detail').hidden = false;
  // zodra geladen is wordt detailpagina zichtbaar en gaat de tekst weg
}

document.getElementById('btn-vorige').addEventListener('click', function() {
  window.location.href = 'detailpagina.html?id=' + (pokemonId - 1);
});
// naar vorige pagina

document.getElementById('btn-volgende').addEventListener('click', function() {
  window.location.href = 'detailpagina.html?id=' + (pokemonId + 1);
});
// naar volgende pagina
if (pokemonId) {
  laadDetailPagina(pokemonId);
}
// functie aanroepen