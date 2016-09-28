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

function binOp(func) {
	return function(op1, op2) {
		return function() {
			return func(op1.apply(null, arguments), op2.apply(null, arguments));
		}
	}
}

var add = binOp(function(a, b){return a + b});
var subtract = binOp(function(a, b){return a - b});
var multiply = binOp(function(a, b){return a * b});
var divide = binOp(function(a, b){return a / b});

function unOp(func) {
	return function(op) {
		return function() {
			return func(op.apply(null, arguments));
		}
	}
}

var negate = unOp(function(a){return -a});

function cnst(val) {
	return function() {
		return val;
	}
}

function variable(x) {
	return function() {
		return arguments[vars[x]];
	}
}

var binOps = {
	"+": add,
	"-": subtract,
	"*": multiply,
	"/": divide,
};

var unOps = {
	"negate": negate,
};

var vars = {
	"x": 0,
	"y": 1,
	"z": 2,
}

function parse(str) {
	str = str.split(/\s+/);
	var stack = [];
	for (var i = 0; i < str.length; i++) {
		if (str[i] in binOps) {
			var b = stack.pop();
			var a = stack.pop();
			stack.push(binOps[str[i]](a, b));
		} else if (str[i] in unOps) {
			stack.push(unOps[str[i]](stack.pop()));
		} else if (str[i] in vars) {
			stack.push(variable(str[i]));
		} else {
			stack.push(cnst(parseInt(str[i])));
		}
	};
	return stack.pop();
}

var expr = subtract(
        multiply(
            cnst(2),
            variable("x")
        ),
        cnst(3)
    );
println(expr(5));

println(parse("y y 2 - * y * 1 +")(4,5));

println(3/0);