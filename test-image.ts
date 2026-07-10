async function getWikiImage(query: string) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (searchData.query.search.length > 0) {
        const title = searchData.query.search[0].title;
        const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400`;
        const imgRes = await fetch(imgUrl);
        const imgData = await imgRes.json();
        const pages = imgData.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pages[pageId].thumbnail) {
            console.log(`Found image for ${query}: ${pages[pageId].thumbnail.source}`);
            return pages[pageId].thumbnail.source;
        }
    }
    console.log(`No image found for ${query}`);
    return null;
}

async function test() {
    await getWikiImage("Apple juice");
    await getWikiImage("Mosambi juice");
    await getWikiImage("Strawberry Milkshake");
}

test();
