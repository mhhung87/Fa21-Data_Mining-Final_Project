$('form').submit((e) => {
  e.preventDefault();
  const kw = $('#input-search').val();
  const year = parseInt($('#input-year').val());
  startSearch(kw, year);
});

function startSearch(kw, year) {
  $.post('./s/search', {name: kw, year: year})
    .done((res) => {
      console.log(res.data);
      window.location.href = '/result?id=' + res.data.id;
    })
    .fail((err) => {
      alert('Search failed', err);
    });
}