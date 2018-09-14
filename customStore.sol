pragma solidity ^0.4.20;

contract CustomStore {

    event ValueChanged(address indexed author, string oldValue, string newValue);

    string _value = "First!!1";
    string version = "State your own version";
    string code = "enter your own code";
    
    function setValue(string value, string new_version, string new_code ) public {
        emit ValueChanged(msg.sender, _value, value);
        _value = value;
        version = new_version;
        code = new_code;
    }

    function value() public constant returns (string, string, string) {
        return (_value, version, code);
    }

}