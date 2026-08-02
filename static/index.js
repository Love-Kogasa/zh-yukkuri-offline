(async () => {
  var [input, fileName, voices, speed, speedNumber, play, download] = ["input", "filename", "voices", "speed", "speednumber", "play", "download"]
    .map(document.getElementById.bind(document))
  Qmsg.success("页面渲染成功")
  var loadFile = Qmsg.loading("资源加载中，请稍等...")
  const list = Object.fromEntries(await yukkuri.Resource.loadList([
    "static/converter.tsv",
    "static/voices/v86.wasm",
    "static/voices/f1.zip",
    "static/voices/f2.zip",
    "static/voices/imd1.zip",
    "static/voices/m1.zip",
    "static/voices/m2.zip",
    "static/voices/jgr.zip",
    "static/voices/dvd.zip",
    "static/voices/r1.zip"
  ]))
  const map = await (await fetch(list["static/converter.tsv"])).text()
  loadFile.close()
  Qmsg.success("资源加载完成")
  var tryAqtk = Qmsg.loading("尝试创建默认Aqtk实例")
  var tmpAqtk = {destroy: () => void 0}
  var tmpMsg = {}
  // 年年考年年错，又写成oninput了(
  voices.onchange = async () => {
    await tmpAqtk.destroy()
    tmpAqtk = await yukkuri.load(list["static/voices/" + voices.value + ".zip"], voices.value + "/AquesTalk.dll", {
      wasmPath: list["static/voices/v86.wasm"],
      map
    })
    Qmsg.success("成功创建Aqtk实例")
  }
  await voices.onchange()
  tryAqtk.close()
  speed.oninput = () => {
    speedNumber.textContent = speed.value + "%"
  }
  play.onclick = async () => {
    try {
      if(tmpMsg[voices.value + input.value + speed.value]) {
        tmpMsg[voices.value + input.value + speed.value].play()
      } else {
        var sound = await tmpAqtk.run(input.value, speed.value)
        var blob = new Blob([sound], {type: 'audio/wav'})
        var url = URL.createObjectURL(blob)
        var audio = new Audio(url)
        tmpMsg[voices.value + input.value + speed.value] = audio
        audio.play()
      }
    } catch(err) {
      Qmsg.error(err.toString())
      console.error(err)
    }
  }
  download.onclick = async () => {
    Qmsg.info("下载我懒得做缓存优化机制了，可能较慢")
    var sound = await tmpAqtk.run(input.value, speed.value)
    var blob = new Blob([sound], {type: 'audio/wav'})
    var url = URL.createObjectURL(blob)
    var downloader = document.createElement("a")
    downloader.download = fileName.value
    downloader.href = url
    downloader.click()
  }
})()