
const puppeteer = require('puppeteer');
const fs = require('fs');
const Jimp = require("jimp");
const jsQR = require("jsqr");
const decodeResults = [];
const addrPorts = [];
let page = undefined;


function shouldAdd(rawStr) {
    if (!rawStr.includes("://")) {
        console.log("invalid scan result:" + rawStr);
        return false;
    }
    if (rawStr.startsWith("ssr")) {
        console.log("ssr protocol not supported:" + rawStr);
        return false;
    }

    if (rawStr.includes("trojan")) {
        return decodeResults.includes(rawStr);
    }
    const base64string = rawStr.split("://")[1];

    // Create a buffer from the string
    let bufferObj = Buffer.from(base64string, "base64");

    // Encode the Buffer as a utf8 string
    let decodedString = bufferObj.toString("utf8");
    let node = undefined;
    let needJSONParse = true;
    if (rawStr.startsWith("ss://")) {
        needJSONParse = false;
    }
    try {
        if (needJSONParse) {
            node = JSON.parse(decodedString);
        }
    } catch (error) {
        console.log("JSON parse error:" + decodedString);
        return false;
    }
    let hostPort = needJSONParse ? node.add + ":" + node.port : rawStr;
    if (addrPorts.includes(hostPort)) {
        console.log("already added:" + hostPort);
        return false;
    } else {
        console.log("new node:" + JSON.stringify(node));
        addrPorts.push(hostPort);
        return true;
    }
}


async function doDecode() {
    const buffer = await page.screenshot({
        path: "./temp.jpg",
        type: "png"
    })

    Jimp.read(buffer, function (err, image) {
        if (err) {
            console.error(err);
        }
        const qrCodeImageArray = new Uint8ClampedArray(image.bitmap.data.buffer);
        const qrCodeResult = jsQR(
            qrCodeImageArray,
            image.bitmap.width,
            image.bitmap.height
        );
        if (qrCodeResult) {
            // console.log("Found QR code", qrCodeResult);
            const value = qrCodeResult.data;
            const result = value.replace(/vme{s/g, "vmess");
            if (shouldAdd(result)) {
                decodeResults.push(result)
                const content = decodeResults.join("\r\n");
                fs.writeFile('./result.txt', content, err => {

                });
                console.log("current result count: " + decodeResults.length);
            }
        } else {
            console.log("no qr-code found in image...");
        }
    });
}


async function main() {
    const browser = await puppeteer.launch({
        // headless:false,
        executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
    });
    page = await browser.newPage();

    await page.goto('https://www.youtube.com/watch?v=0LFElpy53aU&ab_channel=%E4%B8%8D%E8%89%AF%E6%9E%97');

    setInterval(() => {
        try {
            doDecode();
        } catch (error) {
            console.warn(error);
        }
    }, 10000);

    process.on('exit', async function (code) {
        await browser.close();
    });
    process.on('SIGINT', function () { process.exit() })

}

try {
    main();
} catch (error) {
    console.log(error);
}




