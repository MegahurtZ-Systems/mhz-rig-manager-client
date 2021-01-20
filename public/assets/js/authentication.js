'use strict';

console.log('authentication script loaded successfully');
const server = "https://" + window.location.href.split('/')[2];
console.log("Server:", server)
// window.stop();
// console.log('Loading is stopped')
function toLogin(){
    window.location.replace(`${server}/`);
}

if(localStorage.length == 0){
    toLogin()
}

const URL = server + '/api/verify';
let localStore = JSON.parse(localStorage.getItem('PWM'))
let hashedToken = hex_sha256(localStore.jwt)
let keyedToken = generateKey(hashedToken)
let decryptedMasterHash = decrypt(keyedToken, localStore.key)
let masterHashKey = generateKey(decryptedMasterHash)
$.ajax({
    type: 'POST',
    url: URL,
    dataType: 'json',
    headers: {
        'authorization': 'Bearer ' + JSON.stringify(localStore.jwt)
    },
    data: {
        username: localStore.user,
    }
}).done(function (data) {
    // let encrypted = JSON.parse(data)
    // // console.log("encrypted request:", encrypted)
    // for (let i = 0; i < encrypted.passwords.length; i++) {
    //     let fixed = JSON.parse(decrypt(masterHashKey, encrypted.passwords[i]))
    //     listPW.push(fixed);
    // }
    console.log("data:", data)
    if (data.authenticated === "true"){
        
    } else {
        console.log("not authorized")
    }
});