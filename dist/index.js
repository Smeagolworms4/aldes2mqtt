"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const minimist_1 = __importDefault(require("minimist"));
const mqtt = __importStar(require("mqtt"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const jwt_decode_1 = require("jwt-decode");
console.log('');
console.log('======================');
console.log('= Start ALdes 2 MQTT =');
console.log('======================');
console.log('');
const rawArgv = process.argv.slice(2);
const args = (0, minimist_1.default)(rawArgv, {
    string: [
        'mqtt-uri',
        'mqtt-prefix',
        'mqtt-retain',
        'mqtt-qos',
        'aldes-login',
        'aldes-password',
        'scan-interval',
        'ha-discovery',
        'ha-prefix',
        'log'
    ],
    boolean: [
        'help',
    ],
    alias: {
        'mqtt-uri': 'm',
        'aldes-login': 'u',
        'aldes-password': 'p',
        'log': 'l',
        'help': 'h',
    },
    default: {
        log: 'MESSAGE',
        'mqtt-prefix': 'aldes',
        'mqtt-retain': '1',
        'mqtt-qos': '0',
        'ha-discovery': '1',
        'ha-prefix': 'homeassistant',
        'scan-interval': '30',
    }
});
let argError = null;
if (!args.p)
    argError = 'aldes-password as required';
if (!args.l)
    argError = 'aldes-login as required';
if (!args.m)
    argError = 'mqtt-uri as required';
if (!args['mqtt-prefix'])
    argError = 'mqtt-prefix as required';
if (args.h || argError) {
    if (argError) {
        console.error('ERROR:', argError);
    }
    console.log(`
Run command:
    
    ${process.argv[0]} ${process.argv[1]} [PARAMS]
   
Parameters:
    
    mqtt-uri, m              Set MQTT URI for connection (example: mqtt://login:password@127.0.0.1:1883 or mqtt://127.0.0.1:1883)
    mqtt-prefix              Set prefix for mqtt(default: omv)
    mqtt-retain              Set retain value for MQTT, values must be 0 or 1 (default: 1),
    mqtt-qos                 Set QOS value for MQTT, values must be 0, 1 or 2 (default: 0),
    aldes-login, u           Set login for Aldes API
    aldes-password, p        Set password for Aldes API
    scan-interval            Set scan refresh interval in second (default: 30) 
    ha-discovery             Enable Home Assistant discovery, values must be 0 or 1 (default: 1),
    ha-prefix                Home Assistant discovery prefix (default: homeassistant),
    log, l                   Log level (ERROR, MESSAGE, DEBUG) (default MESSAGE)
    help, h                  Display help
    
    `);
    process.exit(0);
}
const mqttUri = args.m;
const mqttPrefix = args['mqtt-prefix'];
const mqttRetain = args['mqtt-retain'] === '1' || args['mqtt-retain']?.toLowerCase() === 'true';
let mqttQos = parseInt(args['mqtt-qos'], 10);
switch (mqttQos) {
    case 1: break;
    case 2: break;
    default: mqttQos = 0;
}
const aldesLogin = args.u;
const aldesPassword = args.p;
let scanIterval = parseInt(args['scan-interval'], 10);
isNaN(scanIterval) || scanIterval < 1 ? 30 : scanIterval;
const haDiscovery = args['ha-discovery'] === '1' || args['ha-discovery']?.toLowerCase() === 'true';
const haPrefix = (args['ha-prefix'] || 'homeassistant');
console.log('Config:', `
    mqtt-uri:                ${mqttUri}
    mqtt-prefix:             ${mqttPrefix}
    mqtt-retain:             ${mqttRetain ? 'enabled' : 'disabled'}
    mqtt-qos:                ${mqttQos}
    aldes-login:             ${aldesLogin}
    aldes-password:          ${aldesPassword.replace(/./g, '*')}
    scan-interval:           ${scanIterval}
    ha-discovery:            ${haDiscovery ? 'enabled' : 'disabled'}
    ha-prefix:               ${haPrefix}
    log:                     ${args.l.toUpperCase()}
`);
switch (args.l.toLowerCase()) {
    case 'error': console.log = () => { };
    default: console.debug = () => { };
    case 'debug': break;
}
const BASE_URL = 'https://aldesiotsuite-aldeswebapi.azurewebsites.net';
let client = null;
let token = null;
const subscribed = {};
const subscribe = (topic, callback) => {
    client.subscribe(topic, error => { if (error)
        console.error(error); });
    subscribed[topic] = callback;
};
function publish(path, data) {
    if (client.connected) {
        console.debug('Publish:', path, data);
        client.publish(path, data, { retain: mqttRetain, qos: mqttQos });
    }
    else {
        console.error('Error: Client MQTT not connected');
    }
}
function tokenIsValid(token) {
    if (!token) {
        return false;
    }
    try {
        const decoded = (0, jwt_decode_1.jwtDecode)(token.access_token);
        console.debug('Decoded token', decoded);
        return ((decoded.exp - 3600) * 1000) > Date.now();
    }
    catch (e) {
        console.error(e);
    }
    return false;
}
async function request(path, options = {}) {
    if (tokenIsValid(token)) {
        console.debug('Token valid');
    }
    else {
        try {
            token = await (0, node_fetch_1.default)(`${BASE_URL}/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'username': aldesLogin,
                    'password': aldesPassword,
                    'grant_type': 'password'
                })
            })
                .then(response => {
                if (!response.ok) {
                    console.error(response);
                    throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            });
            console.log('Login success');
            console.debug('New token:', token);
        }
        catch (e) {
            console.error(e);
            new Error('Error on connection to Aldes API');
        }
    }
    const url = `${BASE_URL}${path}`;
    const finalOptions = {
        method: 'GET',
        ...options,
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Accept-Language': 'fr',
            ...(options.headers ?? {}),
        }
    };
    console.debug('Request', url, finalOptions);
    return await (0, node_fetch_1.default)(url, finalOptions)
        .then(response => {
        if (!response.ok) {
            console.error(response);
            throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    });
}
function getMe() {
    return request('/aldesoc/v5/users/me');
}
function getProduct(id) {
    return request(`/aldesoc/v5/users/me/products/${id}`);
}
function sendCommand(id, method, value) {
    return request(`/aldesoc/v5/users/me/products/${id}/commands`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: 1,
            jsonrpc: 2.0,
            method,
            params: [value],
        })
    });
}
const devices = {};
const modeMapping = {
    A: 'auto',
    Z: 'programming',
    V: 'daily',
    W: 'vacation',
    Y: 'boost',
};
const modeRMapping = {
    auto: 'A',
    programming: 'Z',
    daily: 'V',
    vacation: 'W',
    boost: 'Y',
};
function getMode(details) {
    const device = devices[details.serial_number];
    device.prevMode = null;
    if (details.indicators) {
        for (const indicator of details.indicators) {
            if (indicator.type === 'MODE') {
                device.prevMode = indicator.value;
            }
        }
    }
    if (device.lastMode && device.lastModeDate && (Date.now() - device.lastModeDate) < 120000) {
        if (device.lastMode === 'A' || device.lastMode === 'Z') {
            return device.lastMode + (device.prevMode?.[1] ?? 'V');
        }
        return device.lastMode;
    }
    return device.prevMode;
}
function getWeekPlanning(details) {
    const device = devices[details.serial_number];
    const find = (key) => {
        for (const c of details.week_planning) {
            if (c.command.startsWith(key)) {
                return modeMapping[c.command[2]] ?? 'V';
            }
        }
        return 'V';
    };
    const build = (day) => {
        return {
            h0: find('0' + day),
            h1: find('1' + day),
            h2: find('2' + day),
            h3: find('3' + day),
            h4: find('4' + day),
            h5: find('5' + day),
            h6: find('6' + day),
            h7: find('7' + day),
            h8: find('8' + day),
            h9: find('9' + day),
            h10: find('A' + day),
            h11: find('B' + day),
            h12: find('C' + day),
            h13: find('D' + day),
            h14: find('E' + day),
            h15: find('F' + day),
            h16: find('G' + day),
            h17: find('H' + day),
            h18: find('I' + day),
            h19: find('J' + day),
            h20: find('K' + day),
            h21: find('L' + day),
            h22: find('M' + day),
            h23: find('N' + day),
        };
    };
    if (details.week_planning) {
        const result = {
            mon: build('0'),
            tue: build('1'),
            wed: build('2'),
            thu: build('3'),
            fri: build('4'),
            sat: build('5'),
            sun: build('6'),
        };
        device.previousPlanning = result;
        return result;
    }
    return null;
}
async function analyseProduct(product) {
    const details = await getProduct(product.modem);
    console.debug('Product details:', details);
    let device = devices[details.serial_number];
    let build = false;
    if (!device) {
        build = true;
        device = {
            mqqtDevice: {
                "identifiers": [details.serial_number],
                "name": details.reference,
                "manufacturer": "Aldes",
                "model": details.reference,
            },
            nextS: 0,
            nextM: 0,
            nextH: 0,
            nextD: 1,
            lastMode: null,
            lastModeDate: null,
            prevMode: null,
            previousPlanning: null,
        };
        devices[details.serial_number] = device;
    }
    const mode = getMode(details);
    const weekPlanning = getWeekPlanning(details);
    if (!build) {
        device = devices[details.serial_number];
        if (mode) {
            subscribe(`${mqttPrefix}/${details.serial_number}/set_mode`, async (value) => {
                try {
                    console.debug('Set main mode', value);
                    let sendMode = modeRMapping[value] ?? 'V';
                    let secondary = modeRMapping[value] ?? 'V';
                    device.lastMode = sendMode;
                    if (secondary === 'A' || secondary === 'Z') {
                        secondary = device.prevMode?.[1] ?? 'V';
                    }
                    publish(`${mqttPrefix}/${details.serial_number}/mode`, JSON.stringify({
                        main: modeMapping[device.lastMode[0]],
                        secondary: modeMapping[secondary],
                    }));
                    device.lastModeDate = Date.now();
                    if (sendMode === 'W') {
                        const start = new Date();
                        const end = new Date();
                        end.setDate(end.getDate() + device.nextD);
                        end.setHours(end.getHours() + device.nextH, end.getMinutes() + device.nextM, end.getSeconds() + device.nextS);
                        sendMode = `W${start.getUTCFullYear()}${(start.getUTCMonth() + 1).toString().padStart(2, '0')}${start.getUTCDate().toString().padStart(2, '0')}${start.getUTCHours().toString().padStart(2, '0')}${start.getUTCMinutes().toString().padStart(2, '0')}${start.getUTCSeconds().toString().padStart(2, '0')}Z${end.getUTCFullYear()}${(end.getUTCMonth() + 1).toString().padStart(2, '0')}${end.getUTCDate().toString().padStart(2, '0')}${end.getUTCHours().toString().padStart(2, '0')}${end.getUTCMinutes().toString().padStart(2, '0')}${end.getUTCSeconds().toString().padStart(2, '0')}Z`;
                    }
                    await sendCommand(details.modem, 'changeMode', sendMode);
                }
                catch (e) {
                    console.error(e);
                }
            });
            subscribe(`${mqttPrefix}/${details.serial_number}/set_vacation_end_s`, (value) => {
                console.debug('Set vacation end s', value);
                device.nextS = parseInt(value, 10);
                device.nextS = isNaN(device.nextS) ? 0 : device.nextS;
            });
            subscribe(`${mqttPrefix}/${details.serial_number}/set_vacation_end_m`, (value) => {
                console.debug('Set vacation end m', value);
                device.nextM = parseInt(value, 10);
                device.nextM = isNaN(device.nextM) ? 0 : device.nextM;
            });
            subscribe(`${mqttPrefix}/${details.serial_number}/set_vacation_end_h`, (value) => {
                console.debug('Set vacation end h', value);
                device.nextH = parseInt(value, 10);
                device.nextH = isNaN(device.nextH) ? 0 : device.nextH;
            });
            subscribe(`${mqttPrefix}/${details.serial_number}/set_vacation_end_d`, (value) => {
                console.debug('Set vacation end ', value);
                device.nextD = parseInt(value, 10);
                device.nextD = isNaN(device.nextD) ? 0 : device.nextD;
            });
        }
        if (weekPlanning) {
            for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
                for (let h = 0; h < 24; h++) {
                    subscribe(`${mqttPrefix}/${details.serial_number}/set_week_planning_${d}_${h}`, async (value) => {
                        try {
                            console.debug(`Set programing ${d} ${h}h`, value);
                            let param = '';
                            let i = 0;
                            device.previousPlanning[d]['h' + h] = value;
                            for (const d1 of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
                                for (let h1 = 0; h1 < 24; h1++) {
                                    let hStr = h1;
                                    if (hStr > 9) {
                                        hStr = String.fromCharCode(('A'.charCodeAt(0) + hStr - 10));
                                    }
                                    param += hStr + i.toString() + modeRMapping[device.previousPlanning[d1]['h' + h1]];
                                }
                                i++;
                            }
                            await sendCommand(details.modem, 'changePlanningMode', param);
                        }
                        catch (e) {
                            console.error(e);
                        }
                    });
                }
            }
        }
    }
    if (mode) {
        publish(`${mqttPrefix}/${details.serial_number}/mode`, JSON.stringify({
            main: modeMapping[mode[0]],
            secondary: modeMapping[mode[1] ?? mode[0]],
        }));
        publish(`${haPrefix}/select/aldes/${details.serial_number}_main_mode/config`, JSON.stringify({
            name: "Main mode",
            unique_id: `${details.serial_number}_main_mode_selector`,
            object_id: `${details.serial_number}_main_mode`,
            state_topic: `${mqttPrefix}/${details.serial_number}/mode`,
            value_template: '{{ value_json.main }}',
            command_topic: `${mqttPrefix}/${details.serial_number}/set_mode`,
            options: Object.values(modeMapping),
            device: device.mqqtDevice,
        }));
        publish(`${haPrefix}/sensor/aldes/${details.serial_number}_main_mode/config`, JSON.stringify({
            name: "Main mode",
            unique_id: `${details.serial_number}_main_mode`,
            object_id: `${details.serial_number}_main_mode`,
            state_topic: `${mqttPrefix}/${details.serial_number}/mode`,
            value_template: '{{ value_json.main }}',
            device: device.mqqtDevice,
        }));
        publish(`${haPrefix}/sensor/aldes/${details.serial_number}_secondary_mode/config`, JSON.stringify({
            name: "Secondary mode",
            unique_id: `${details.serial_number}_secondary_mode`,
            object_id: `${details.serial_number}_secondary_mode`,
            state_topic: `${mqttPrefix}/${details.serial_number}/mode`,
            value_template: '{{ value_json.secondary }}',
            device: device.mqqtDevice,
        }));
        publish(`${mqttPrefix}/${details.serial_number}/vacation_end`, JSON.stringify({
            s: device.nextS,
            m: device.nextM,
            h: device.nextH,
            d: device.nextD,
        }));
        publish(`${haPrefix}/number/aldes/${details.serial_number}_vacation_end_s/config`, JSON.stringify({
            name: "Second vacation end",
            unique_id: `${details.serial_number}_vacation_end_s`,
            object_id: `${details.serial_number}_vacation_end_s`,
            state_topic: `${mqttPrefix}/${details.serial_number}/vacation_end`,
            value_template: '{{ value_json.s }}',
            command_topic: `${mqttPrefix}/${details.serial_number}/set_vacation_end_s`,
            min: 0,
            max: 59,
            icon: 'mdi:calendar-clock',
            qos: 1,
            device: device.mqqtDevice,
        }));
        publish(`${haPrefix}/number/aldes/${details.serial_number}_vacation_end_m/config`, JSON.stringify({
            name: "Minute vacation end",
            unique_id: `${details.serial_number}_vacation_end_m`,
            object_id: `${details.serial_number}_vacation_end_m`,
            state_topic: `${mqttPrefix}/${details.serial_number}/vacation_end`,
            value_template: '{{ value_json.m }}',
            command_topic: `${mqttPrefix}/${details.serial_number}/set_vacation_end_m`,
            min: 0,
            max: 59,
            step: 1,
            icon: 'mdi:calendar-clock',
            qos: 1,
            device: device.mqqtDevice,
        }));
        publish(`${haPrefix}/number/aldes/${details.serial_number}_vacation_end_h/config`, JSON.stringify({
            name: "Hour vacation end",
            unique_id: `${details.serial_number}_vacation_end_h`,
            object_id: `${details.serial_number}_vacation_end_h`,
            state_topic: `${mqttPrefix}/${details.serial_number}/vacation_end`,
            value_template: '{{ value_json.h }}',
            command_topic: `${mqttPrefix}/${details.serial_number}/set_vacation_end_h`,
            min: 0,
            max: 23,
            step: 1,
            icon: 'mdi:calendar-clock',
            qos: 1,
            device: device.mqqtDevice,
        }));
        publish(`${haPrefix}/number/aldes/${details.serial_number}_vacation_end_d/config`, JSON.stringify({
            name: "Day vacation end",
            unique_id: `${details.serial_number}_vacation_end_d`,
            object_id: `${details.serial_number}_vacation_end_d`,
            state_topic: `${mqttPrefix}/${details.serial_number}/vacation_end`,
            value_template: '{{ value_json.d }}',
            command_topic: `${mqttPrefix}/${details.serial_number}/set_vacation_end_d`,
            min: 0,
            max: 365,
            step: 1,
            icon: 'mdi:calendar-clock',
            qos: 1,
            device: device.mqqtDevice,
        }));
    }
    if (weekPlanning) {
        publish(`${mqttPrefix}/${details.serial_number}/week_planning`, JSON.stringify(weekPlanning));
        for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
            for (let h = 0; h < 24; h++) {
                publish(`${haPrefix}/select/aldes/${details.serial_number}_week_planning_${d}_${h}/config`, JSON.stringify({
                    name: `Prog - ${d} ${h}h`,
                    unique_id: `${details.serial_number}_week_planning_${d}_${h}`,
                    object_id: `${details.serial_number}_week_planning_${d}_${h}`,
                    state_topic: `${mqttPrefix}/${details.serial_number}/week_planning`,
                    value_template: `{{ value_json.${d}.h${h} }}`,
                    command_topic: `${mqttPrefix}/${details.serial_number}/set_week_planning_${d}_${h}`,
                    options: ['daily', 'vacation', 'boost'],
                    device: device.mqqtDevice,
                }));
            }
        }
    }
}
const main = async () => {
    try {
        client = mqtt.connect(mqttUri);
        client.on('connect', () => {
            console.log('Connected to MQTT: ', mqttUri);
        });
        client.on('error', function (error) {
            console.error('Error to MQTT:', error);
        });
        client.on('message', (topic, value) => {
            const cb = subscribed[topic];
            if (cb) {
                cb(value.toString());
            }
        });
        const mainLoop = async () => {
            try {
                console.log('Update data...');
                const user = await getMe();
                console.debug('User:', user);
                await Promise.all(user.products.map(analyseProduct));
                console.log('Update data sucess');
            }
            catch (e) {
                console.log('Main error:', e);
            }
            await new Promise(r => setTimeout(r, scanIterval * 1000));
            mainLoop();
        };
        mainLoop();
    }
    catch (e) {
        console.log('Main error:', e);
    }
};
main();
