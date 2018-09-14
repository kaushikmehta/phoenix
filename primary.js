var address = {
    mainnet: '0x954De93D9f1Cd1e2e3AE5964F614CDcc821Fac64', // Ric Moo
    // testnet: '0x2BA27534A8814765795f1Db8AEa01d5dbe4112d9', // Ric Moo

    testnet: '0x290df537ee4bfc248ca2b02c844b584f1f3d0d0d', // Custom Store
}



var simpleStorage = null;

ethers.getNetwork().then(function(network) {

    simpleStorage = ethers.getContract(address[network],
    //     [
    //         {
    //             constant: true,
    //             inputs: [],
    //             name: "getValue",
    //             outputs: [
    //                 { name: "", type: "string" }
    //             ],
    //             type: "function"
    //         },
    //         {
    //             constant:false,
    //             inputs: [
    //                 { name: "value", type: "string" }
    //             ],
    //             name: "setValue",
    //             outputs: [],
    //             type: "function"
    //         },
    //         {
    //             anonymous: false,
    //             inputs: [
    //                 { indexed: false, name: "oldValue", type:"string" },
    //                 { indexed: false, name: "newValue", type:"string" }
    //             ],
    //             name: "valueChanged",
    //             type: "event"
    //         }
    //     ]
    // // Ric Moo ABI

    // Custom Store ABI

[
    {
        "constant": false,
        "inputs": [
            {
                "name": "value",
                "type": "string"
            },
            {
                "name": "new_version",
                "type": "string"
            },
            {
                "name": "new_code",
                "type": "string"
            }
        ],
        "name": "setValue",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "author",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "oldValue",
                "type": "string"
            },
            {
                "indexed": false,
                "name": "newValue",
                "type": "string"
            }
        ],
        "name": "ValueChanged",
        "type": "event"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getValue",
        "outputs": [
            {
                "name": "",
                "type": "string"
            },
            {
                "name": "",
                "type": "string"
            },
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]
);
    console.log('hello');

    console.log(simpleStorage);

    function grabLatestVal() {

        simpleStorage.getValue().then(function(value) {
            console.log('getValue:', value);
            updateValue(value);
        }, function(error) {
            console.log('Error getValue: ' + error.message);
            console.log(error);
        });

    }
    grabLatestVal();



    simpleStorage.onvaluechanged = function(oldValue, newValue) {
        console.log('event', oldValue, newValue);
        grabLatestVal();
    };

});

 

var textNode = null;
function addText(text) {

    var oldTextNode = textNode;
    if (oldTextNode) {
        oldTextNode.style.opacity = '0';
        textNode.style.transition = 'opacity 0.8s linear, transform 1.5s ease-out';
        oldTextNode.style.transform = 'translate(0, -200px)';
        setTimeout(function() { oldTextNode.remove(); }, 3000);
    }

    textNode = document.createElement('p');
    textNode.textContent = text;
    document.body.appendChild(textNode); 

    setTimeout(function() { textNode.style.opacity = '1'; }, 0);
}


var msg_box = document.getElementById('msg');
var version_box = document.getElementById('version');
var code_box = document.getElementById('code');

var currentValue = null;
function updateValue(value) {

       // Create Custom Text 
    var customText = 'Your asset: ' + value[0] + ' | versioned: ' + value[1] + ' | with details: ' + value [2] + ' | is ready for your review';
    addText(customText);
}

code_box.onkeyup = function(event) {
    if (event.which === 13 && this.value.length > 0) {
        
        var description = document.getElementById('msg').value;
        var version = document.getElementById('version').value;
        var code = code_box.value;
        // var value = [description, version, code];

        simpleStorage.setValue(description, version, code).then(function(transaction) {
            console.log('Transaction (setValue):', transaction);

             processmytransaction(transaction);
               msg_box.value = '';
            version.value = '';
            code_box.value = '';

            grabLatestVal();

            // custom code
           
            //

            


          
        }, function(error) {
            console.log('Error setValue: ' + error.message);
        });
    }
}


// Custom Code
// Transaction Details - To Identify User and Assets involved

function processmytransaction(transaction) {
    var senderAddress = transaction.from;
    var receiverAddess = transaction.to;

    var senderNamePos = getPosition(senderAddress, addressArray);
    var senderName = nameArray[senderNamePos];

    var receiverNamePos = getPosition(receiverAddess, addressArray);
    var receiverName = nameArray[receiverNamePos];

    var customMessage = 'The details were sent by: ' + senderName + ';  to the following address: ' + receiverName;

    console.log(customMessage);


}
var nameArray = ['A Name', 'Contract: RicMoo Store', 'Contract: Custom Store'] ;
var addressArray = ['0xe0DA5D7E78CEA596370c4e60f847DF5788DF79Be', '0x2BA27534A8814765795f1Db8AEa01d5dbe4112d9', '0x290dF537eE4Bfc248cA2B02C844b584f1f3D0d0d'];

function getPosition(elementToFind, arrayElements) {
    

    

    var arrayElements = addressArray;
    var i;
    for (i = 0; i < arrayElements.length; i += 1) {
        if (arrayElements[i] === elementToFind) {
            return i;
        }
    }
    return null; //not found
}



