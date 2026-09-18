const q = "رب";
Promise.allSettled([
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/ar/${encodeURIComponent(q)}`),
  fetch(`https://ar.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&origin=*`)
]).then(async ([dict, wiki]) => {
  if (wiki.status === 'fulfilled' && wiki.value.ok) {
    const data = await wiki.value.json();
    console.log("Wiki Data:", JSON.stringify(data.query.search).substring(0, 200));
  } else {
    console.log("Wiki failed:", wiki);
  }
});
