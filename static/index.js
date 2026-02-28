import {play_wav, loadAquesTalk} from "../xlib/aquestalk/aquestalk.js"

const input = document.getElementById("input")
const play = document.getElementById("play")
const download = document.getElementById("download")
const name = document.getElementById("filename")
// const speed = document.getElementById("speed")
// const rate = document.getElementById("speednumber")

var msg = Qmsg.loading("加载中")

const aquestalk = await loadAquesTalk("./static/f1.zip", "f1/AquesTalk.dll")
const convert = await initConverter()

/** aquestalk.js 未实现该功能
 * speed.oninput = () => {
 *    rate.textContent = speed.value + "%"
 * }
 */

play.onclick = async () => {
    try {
        play_wav(await aquestalk.run(convert(input.value/*, parseInt(speed.value)*/)))
    } catch(error) {
        alert(error)
    }
}

download.onclick = async () => {
  const blob = new Blob([await aquestalk.run(convert(input.value))], { type: "audio/wav" })
  const url = URL.createObjectURL(blob);
  var a = document.createElement("a")
  a.download = name.value
  a.href = url
  a.click()
}

msg.close()
Qmsg.success("加载成功")