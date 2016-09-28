// BEGIN print() and println() definition
if (typeof print === 'undefined') {
	var print = function() {
		var str = "";
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] != null) {
				if (i > 0) {
					str += " ";
				};
				str += arguments[i];
			};
		};
		process.stdout.write(str);
	};
	var println = function() {
		print.apply(null, arguments);
		console.log();
	};
};
// END print() and println() definition

function operator(func) {
	return function() {
		var args = arguments;
		return function() {
			var values = [];
			for (var i = 0; i < args.length; i++) {
				values.push(args[i].apply(null, arguments));
			};
			return func.apply(null, values);
		}
	}
}

function applyPredicate(init, predicate) {
	return function() {
		for (var i = 0; i < arguments.length; i++) {
			if (predicate(arguments[i], init)) {
				init = arguments[i];
			}
		}
		return init;
	}
}

function getFromStackApplyAndPush(stack) {
	return function(func, times) {
		var args = [];
		for (var i = 0; i < times; i++) {
			args.unshift(stack.pop());
		}
		stack.push(func.apply(null, args));
	}
}

var min = operator(applyPredicate(Infinity, function(a, b){return a < b}));
var max = operator(applyPredicate(-Infinity, function(a, b){return a > b}))

var functionsWithVariableAmountOfArgs = {
	"min": min,
	"max": max,
}

var add 	 = operator(function(a, b){return a + b});
var subtract = operator(function(a, b){return a - b});
var multiply = operator(function(a, b){return a * b});
var divide   = operator(function(a, b){return a / b});
var mod 	 = operator(function(a, b){return a % b});
var negate 	 = operator(function(a){return -a});
var abs      = operator(Math.abs);
var log      = operator(Math.log);
var power    = operator(Math.pow);

function cnst(val) {
	return function() {
		return val;
	}
}

function variable(x) {
	var index = vars[x]
	return function() {
		return arguments[index];
	}
}

var binOps = {
	"+": add,
	"-": subtract,
	"*": multiply,
	"/": divide,
	"%": mod,
	"**": power,
};

var unOps = {
	"negate": negate,
	"abs": abs,
	"log": log,
};

var vars = {
	"x": 0,
	"y": 1,
	"z": 2,
}

function parse(str) {
	str = str.split(/\s+/);
	var stack = [];
	var stackGetterPusher = getFromStackApplyAndPush(stack);
	for (var i = 0; i < str.length; i++) {
		var res = str[i].match(/([a-z]+)(\d+)/);
		if (str[i] in binOps) {
			stackGetterPusher(binOps[str[i]], 2);
		} else if (str[i] in unOps) {
			stackGetterPusher(unOps[str[i]], 1);
		} else if (str[i] in vars) {
			stack.push(variable(str[i]));
		} else if (res) {
			stackGetterPusher(functionsWithVariableAmountOfArgs[res[1]], res[2]);
		} else {
			stack.push(cnst(parseInt(str[i])));
		}
	};
	return stack.pop();
}

println(parse("10")(1))