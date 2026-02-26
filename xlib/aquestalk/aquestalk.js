// https://stackoverflow.com/questions/15761790/convert-a-32bit-integer-into-4-bytes-of-data-in-javascript/24947000
function to_bytes_uint32(num) {
    return new Uint8Array([
        num & 0x000000ff,
        (num & 0x0000ff00) >> 8,
        (num & 0x00ff0000) >> 16,
        (num & 0xff000000) >> 24,
    ]);
}
function from_bytes_uint32(bytes) {
    return ((bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0);
}
function convert_sjis(str) {
    const unicodeArray = Encoding.stringToCode(str);
    const sjisArray = Encoding.convert(unicodeArray, {
        to: "SJIS",
        from: "UNICODE",
    });
    return new Uint8Array(sjisArray);
}
function uint8array_concat(a, b) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}

var __classPrivateFieldGet$1 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Heap_instances, _Heap_create_heap;
const uc$3 = window.uc;
class Heap {
    constructor(mu, heap_addr, heap_len = 0) {
        _Heap_instances.add(this);
        this.heap_used = 0;
        this.heap_addr = heap_addr;
        this.heap_len = heap_len;
        __classPrivateFieldGet$1(this, _Heap_instances, "m", _Heap_create_heap).call(this, mu);
    }
    set_mem_value(mu, value) {
        const write_address = this.heap_addr + this.heap_used;
        if (write_address + value.length >= this.heap_addr + this.heap_len) {
            throw new Error("heap over");
        }
        mu.mem_write(write_address, value);
        this.heap_used += value.length;
        return write_address;
    }
    clear_heap(mu) {
        mu.mem_unmap(this.heap_addr, this.heap_len);
        this.heap_used = 0;
        __classPrivateFieldGet$1(this, _Heap_instances, "m", _Heap_create_heap).call(this, mu);
    }
}
_Heap_instances = new WeakSet(), _Heap_create_heap = function _Heap_create_heap(mu) {
    mu.mem_map(this.heap_addr, this.heap_len, uc$3.PROT_ALL);
};
const NOP_CODE = new Uint8Array([0x90]);
function hook_lib_call(mu, address, callback, arg = null) {
    mu.mem_write(address, NOP_CODE);
    mu.hook_add(uc$3.HOOK_CODE, (...arg) => {
        callback(...arg);
    }, arg, address, address + 4);
}
function reg_read_uint32(mu, reg) {
    return from_bytes_uint32(mu.reg_read(reg, 4));
}
function reg_write_uint32(mu, reg, value) {
    mu.reg_write(reg, to_bytes_uint32(value));
}
function align_to_0x1000(number) {
    return Math.floor((number + 0xfff) / 0x1000) * 0x1000;
}

const uc$2 = window.uc;
function push(mu, value) {
    reg_write_uint32(mu, uc$2.X86_REG_ESP, reg_read_uint32(mu, uc$2.X86_REG_ESP) - 4);
    mu.mem_write(reg_read_uint32(mu, uc$2.X86_REG_ESP), to_bytes_uint32(value));
}
function pop(mu) {
    const value = from_bytes_uint32(mu.mem_read(reg_read_uint32(mu, uc$2.X86_REG_ESP), 4));
    reg_write_uint32(mu, uc$2.X86_REG_ESP, reg_read_uint32(mu, uc$2.X86_REG_ESP) + 4);
    return value;
}
function jmp(mu, address) {
    reg_write_uint32(mu, uc$2.X86_REG_EIP, address);
}
function call(mu, address) {
    push(mu, reg_read_uint32(mu, uc$2.X86_REG_EIP));
    jmp(mu, address);
}
function ret(mu) {
    const ret_address = pop(mu);
    jmp(mu, ret_address);
}
function get_arg(mu, num) {
    return from_bytes_uint32(mu.mem_read(reg_read_uint32(mu, uc$2.X86_REG_ESP) + 4 * (1 + num), 4));
}

const uc$1 = window.uc;
function malloc_hook(mu, ...args) {
    const arg0 = get_arg(mu, 0);
    const last_callback_arg = args[args.length - 1];
    if (typeof last_callback_arg != "function") {
        throw new Error("malloc_hook: last argument must be a function");
    }
    // set_mem_value
    const address = last_callback_arg(mu, new Uint8Array(arg0).fill(0));
    reg_write_uint32(mu, uc$1.X86_REG_EAX, address);
    ret(mu);
}
function strncmp_hook(mu, ..._args) {
    const str0 = get_arg(mu, 0);
    const str1 = get_arg(mu, 1);
    const max_len = get_arg(mu, 2);
    let result = 0;
    for (let i = 0; i < max_len; i++) {
        if (mu.mem_read(str0 + i, 1)[0] !== mu.mem_read(str1 + i, 1)[0]) {
            result = mu.mem_read(str0 + i, 1)[0] - mu.mem_read(str1 + i, 1)[0];
            break;
        }
    }
    reg_write_uint32(mu, uc$1.X86_REG_EAX, result);
    ret(mu);
}
function strncpy_hook(mu, ..._args) {
    const dest = get_arg(mu, 0);
    const src = get_arg(mu, 1);
    const count = get_arg(mu, 2);
    mu.mem_write(dest, mu.mem_read(src, count));
    reg_write_uint32(mu, uc$1.X86_REG_EAX, dest);
    ret(mu);
}
function free_hook(mu, ..._args) {
    // const _address = get_arg(mu, 0);
    ret(mu);
}

var __classPrivateFieldSet = (undefined && undefined.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AquesTalk_instances, _AquesTalk_dll_file, _AquesTalk_mu, _AquesTalk_heap, _AquesTalk_reset_esp, _AquesTalk_init, _AquesTalk_reset;
const _strncmp = "8b ff 55 8b ec 53 56 8b 75 10 33 d2 57 85 f6 0f 84 8a 00 00 00 83 fe 04 72 68 8d 7e fc 85 ff 74 61 8b 4d 0c 8b 45 08 8a 18 83 c0 04 83 c1 04 84 db 74 44 3a 59 fc 75 3f 8a 58 fd 84 db 74 32 3a 59 fd 75 2d 8a 58 fe 84 db 74 20 3a 59 fe 75 1b 8a 58 ff 84 db 74 0e 3a 59 ff 75 09 83 c2 04 3b d7 72 c4 eb 23 0f b6 49 ff eb 10 0f b6 49 fe eb 0a 0f b6 49 fd eb 04 0f b6 49 fc 0f b6 c3 2b c1 eb 1f 8b 4d 0c 8b 45 08 3b d6 73 13 2b c1 8a 1c 08 84 db 74 11 3a 19 75 0d 42 41 3b d6 72 ef 33 c0 5f 5e 5b 5d c3 0f b6 09 eb d0";
const strncmp = new Uint8Array(_strncmp.split(" ").map((v) => parseInt(v, 16)));
class AquesTalk {
    constructor(file, mu) {
        _AquesTalk_instances.add(this);
        _AquesTalk_dll_file.set(this, void 0);
        _AquesTalk_mu.set(this, void 0);
        this.BASE_ADDRESS = 268435456;
        this.AquesTalk_Synthe = this.BASE_ADDRESS + 0x15f0;
        this.HEAP_ADDRESS = 536870912;
        this.HEAP_LENGTH = 16777216;
        // init内で初期化するため、nullで初期化
        _AquesTalk_heap.set(this, null);
        __classPrivateFieldSet(this, _AquesTalk_dll_file, file, "f");
        __classPrivateFieldSet(this, _AquesTalk_mu, mu, "f");
        __classPrivateFieldGet(this, _AquesTalk_instances, "m", _AquesTalk_init).call(this);
    }
    run(koe, speed = 100) {
        const mu = __classPrivateFieldGet(this, _AquesTalk_mu, "f");
        const strncmp_addr_place = 0x1000700c;
        const strncmp_fn = __classPrivateFieldGet(this, _AquesTalk_heap, "f").set_mem_value(mu, strncmp);
        console.log(`strncmp_fn: ${strncmp_fn}`);
        mu.mem_write(strncmp_addr_place, to_bytes_uint32(strncmp_fn));
        const size = __classPrivateFieldGet(this, _AquesTalk_heap, "f").set_mem_value(mu, new Uint8Array(8).fill(0));
        const koe_addr = __classPrivateFieldGet(this, _AquesTalk_heap, "f").set_mem_value(mu, uint8array_concat(convert_sjis(koe), new Uint8Array([0x0])));
        push(mu, size);
        push(mu, speed);
        push(mu, koe_addr);
        const return_fn_addr = __classPrivateFieldGet(this, _AquesTalk_heap, "f").set_mem_value(mu, new Uint8Array(4).fill(NOP_CODE[0]));
        reg_write_uint32(mu, uc.X86_REG_EIP, return_fn_addr);
        call(mu, this.AquesTalk_Synthe);
        try {
            mu.emu_start(reg_read_uint32(mu, uc.X86_REG_EIP), return_fn_addr, 0, 0);
        }
        catch (e) {
            console.error(e);
            console.error(`error at: EIP: `, reg_read_uint32(mu, uc.X86_REG_EIP).toString(16));
            console.error(`error at: ESP:`, reg_read_uint32(mu, uc.X86_REG_ESP).toString(16));
            __classPrivateFieldGet(this, _AquesTalk_instances, "m", _AquesTalk_reset).call(this);
            throw e;
        }
        const size_value = from_bytes_uint32(mu.mem_read(size, 4));
        const return_value = reg_read_uint32(mu, uc.X86_REG_EAX);
        console.log(`(return value) eax: `, return_value);
        console.log(`*size: `, size_value);
        if (return_value === 0) {
            throw new Error(`AquesTalk_Synthe error. ERROR CODE: ${size_value}`);
        }
        const result = mu.mem_read(return_value, size_value);
        __classPrivateFieldGet(this, _AquesTalk_instances, "m", _AquesTalk_reset).call(this);
        return result;
    }
}
_AquesTalk_dll_file = new WeakMap(), _AquesTalk_mu = new WeakMap(), _AquesTalk_heap = new WeakMap(), _AquesTalk_instances = new WeakSet(), _AquesTalk_reset_esp = function _AquesTalk_reset_esp() {
    reg_write_uint32(__classPrivateFieldGet(this, _AquesTalk_mu, "f"), uc.X86_REG_ESP, this.HEAP_ADDRESS + this.HEAP_LENGTH);
}, _AquesTalk_init = function _AquesTalk_init() {
    const mu = __classPrivateFieldGet(this, _AquesTalk_mu, "f");
    const FS_ADDRESS = 0;
    const LIB_SPACE = 65536;
    mu.mem_map(this.BASE_ADDRESS, align_to_0x1000(__classPrivateFieldGet(this, _AquesTalk_dll_file, "f").byteLength), uc.PROT_ALL);
    mu.mem_map(LIB_SPACE, 0x10000, uc.PROT_ALL);
    mu.mem_map(FS_ADDRESS, 0x1000, uc.PROT_ALL);
    __classPrivateFieldSet(this, _AquesTalk_heap, new Heap(mu, this.HEAP_ADDRESS, this.HEAP_LENGTH), "f");
    mu.mem_write(this.BASE_ADDRESS, new Uint8Array(__classPrivateFieldGet(this, _AquesTalk_dll_file, "f")));
    __classPrivateFieldGet(this, _AquesTalk_instances, "m", _AquesTalk_reset_esp).call(this);
    hook_lib_call(mu, 0x0001765c, malloc_hook, (mu, value) => __classPrivateFieldGet(this, _AquesTalk_heap, "f").set_mem_value(mu, value));
    hook_lib_call(mu, 0x00017666, strncmp_hook);
    hook_lib_call(mu, 0x00017670, strncpy_hook);
    hook_lib_call(mu, 0x00017654, free_hook);
}, _AquesTalk_reset = function _AquesTalk_reset() {
    __classPrivateFieldGet(this, _AquesTalk_heap, "f").clear_heap(__classPrivateFieldGet(this, _AquesTalk_mu, "f"));
    reg_write_uint32(__classPrivateFieldGet(this, _AquesTalk_mu, "f"), uc.X86_REG_EAX, 0);
    __classPrivateFieldGet(this, _AquesTalk_instances, "m", _AquesTalk_reset_esp).call(this);
};
const uc = window.uc;
async function loadAquesTalk(zippath, dllpath) {
    const zip = new JSZip();
    const zipbin = await (await fetch(zippath)).arrayBuffer();
    const ziproot = await zip.loadAsync(zipbin);
    const dllfile = await ziproot.files[dllpath].async("arraybuffer");
    return new AquesTalk(dllfile, new uc.Unicorn(uc.ARCH_X86, uc.MODE_32));
}
async function play_wav(wav) {
  const blob = new Blob([wav], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  URL.revokeObjectURL(url);
}

export {loadAquesTalk, play_wav, AquesTalk}