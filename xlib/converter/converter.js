var chineseNumber = window.index.NumberToChineseWords

async function initConverter() {
    var converter = await PinyinToKana.loadDict("static/converter.tsv")
    return string => {
        string = string.replace(/-{0,1}\d+(\.\d+){0,1}/g, matched => {
            try {
                return chineseNumber.toWords(Number (matched))
            } catch(error) {
                return matched
            }
        }).replaceAll(" ", "_")
        return converter.pinyinToKana(
            Pinyin.parse( string ).map( t => t.type === 2 ? t.target + " " : t.source ).join( "" )
        ).replaceAll("_", " ")
    }
}