"use strict";

// BEGIN print() and println() definition
if (typeof print === 'undefined') {
	var print = function() {
		process.stdout.write(Array.prototype.map.call(arguments, String).join(' '));
	};
	var println = function() {
		console.log(Array.prototype.map.call(arguments, String).join(' '));
	};
};
// END print() and println() definition

var operators = function(){
	function AbstractOperator() {
		this.args = arguments;
	}
	AbstractOperator.prototype.evaluate = function() {
		var evalArgs = arguments;
		var values = Array.prototype.map.call(this.args, function(el){
			return el.evaluate.apply(el, evalArgs)
		});
		return this._calculate.apply(this, values)
	},
	AbstractOperator.prototype.toString = function() {
		var str = "";
		for (var i = 0; i < this.args.length; i++) {
			str += this.args[i] + " ";
		};
		str += this._opName;
		return str;
	},
	AbstractOperator.prototype.diff = function(x) {
		var argsDiffed = Array.prototype.map.call(this.args, function(el){
			return el.diff(x)
		});
		return this._diff(this.args, argsDiffed);
	},
	AbstractOperator.prototype.simplify = function() {
		var evalArgs = arguments;
		var allConsts = true;
		this.args = Array.prototype.map.call(this.args, function(el){
			var argSimplified = el.simplify.apply(el, evalArgs);
			if (!(argSimplified instanceof Const)) {
				allConsts = false;
			};
			return argSimplified;
		});
		return allConsts ? new Const(this.evaluate()) : this._simplify.apply(this, this.args);
	}
	AbstractOperator.prototype.prefix = function() {
		var str = "";
		for (var i = 0; i < this.args.length; i++) {
			str += " " + this.args[i].prefix();
		};
		str = "(" + this._opName + str + ")";
		return str;
	}

	function OperatorError(message) {
		this.name = "OperatorError";
		this.message = message;
	}
	OperatorError.prototype = Error.prototype;

	return function(predicateCountOfArgs, strNumOfArgs, opName, calculate, diff, simplify) {
		var op = function() {
			if (!predicateCountOfArgs(arguments.length)) {
				throw new OperatorError("Wrong number of arguments, " + strNumOfArgs + " expected, " +
					arguments.length + " found");
			};
			AbstractOperator.apply(this, arguments);
		}
		op.prototype = Object.create(AbstractOperator.prototype);
		op.prototype._opName = opName;
		op.prototype._calculate = calculate;
		op.prototype._diff = diff;
		op.prototype._simplify = simplify;
		return op;
	}

}();

function predicateExact(a) {
	return function(b) {
		return a == b;
	}
}

var binaryOperator = operators.bind(null, predicateExact(2), 2);
var unaryOperator = operators.bind(null, predicateExact(1), 1);

function Const(val) {
	this.val = val;
}
Const.prototype.evaluate = function() {
	return this.val;
},
Const.prototype.toString =  function() {
	return this.val.toString();
},
Const.prototype.diff = function() {
	return consts[0];
},
Const.prototype.simplify = function() {
	return this;
}
Const.prototype.prefix = Const.prototype.toString;

function Variable(x) {
	this._x = x;
}
Variable.prototype.evaluate = function() {
	return arguments[vars[this._x]];
},
Variable.prototype.toString =  function() {
	return this._x.toString();
},
Variable.prototype.diff = function(x) {
	var val;
	if (x == this._x) {
		val = consts[1];
	} else {
		val = consts[0];
	}
	return val;
},
Variable.prototype.simplify = function() {
	return this;
}
Variable.prototype.prefix = Variable.prototype.toString;

function checkConst(a, val, res) {
	if (a instanceof Const && a.evaluate() == val) {
		return res;
	}
}

function testSimplify() {
	for (var i = 0; i < arguments.length; i++) {
		if (arguments[i]) {
			return arguments[i];
		}
	}
	return this;
}

var consts = {
	"0": new Const(0),
	"1": new Const(1),
}

var Add = binaryOperator("+",
	function(a, b){return a + b},
	function(args, argsDiffed){return new Add(argsDiffed[0], argsDiffed[1])},
	function (a, b) {
		return testSimplify.call(this, checkConst(a, 0, b), checkConst(b, 0, a))
	}
);
var Subtract = binaryOperator("-",
	function(a, b){return a - b},
	function(args, argsDiffed){return new Subtract(argsDiffed[0], argsDiffed[1])},
	function(a, b) {
		return testSimplify.call(this, checkConst(a, 0, new Negate(b)), checkConst(b, 0, a))
	}
);
var Multiply = binaryOperator("*",
	function(a, b){return a * b},
	function(args, argsDiffed){
		return new Add(
			new Multiply(argsDiffed[0], args[1]),
			new Multiply(args[0], argsDiffed[1])
		);
	},
	function(a, b) {
		return testSimplify.call(this, 
			checkConst(a, 1, b), 
			checkConst(b, 1, a),
			checkConst(a, 0, consts[0]), 
			checkConst(b, 0, consts[0])
		)
	}
);
var Divide = binaryOperator("/",
	function(a, b){return a / b},
	function(args, argsDiffed){
		return new Divide(
			new Subtract(
				new Multiply(argsDiffed[0], args[1]),
				new Multiply(args[0], argsDiffed[1])
			),
			new Multiply(args[1], args[1])
		);
	},
	function(a, b) {
		return testSimplify.call(this, 
			checkConst(a, 0, consts[0]),
			checkConst(b, 1, a)
			)}
);
var Negate = unaryOperator("negate",
	function(a){return -a},
	function(args, argsDiffed){return new Negate(argsDiffed[0])},
	function() {return this}
);
var Sin = unaryOperator("sin",
	Math.sin,
	function(args, argsDiffed){ return new Multiply(new Cos(args[0]), argsDiffed[0]) },
	function() {return this}
);
var Cos = unaryOperator("cos",
	Math.cos,
	function(args, argsDiffed) {return new Multiply(new Negate(new Sin(args[0])), argsDiffed[0])},
	function() {return this}
);
var Exp = unaryOperator("exp",
	Math.exp,
	function(args, argsDiffed) {return new Multiply(this, argsDiffed[0])},
	function() {return this}
	);
var ArcTan = unaryOperator("atan",
	Math.atan,
	function(args, argsDiffed) {return new Divide(
		argsDiffed[0],
		new Add(consts[1], new Multiply(args[0], args[0]))
	)},
	function() {return this}
	);

var binOps = {
	"+": Add,
	"-": Subtract,
	"*": Multiply,
	"/": Divide,
};

var unOps = {
	"negate": Negate,
	"sin": Sin,
	"cos": Cos,
	"atan": ArcTan,
	"exp": Exp,
};

var allOperators = {
	"1": unOps,
	"2": binOps,
}

var vars = {
	"x": 0,
	"y": 1,
	"z": 2,
}

function parse(str) {
	function getFromStackApplyAndPush(obj, times) {
		var args = [obj];
		args.push.apply(args, stack.splice(stack.length - times, times));
		stack.push(new (obj.bind.apply(obj, args)));
	}

	str = str.split(/\s+/);
	var stack = [];
	for (var i = 0; i < str.length; i++) {
		if (str[i] != '') {
			if (str[i] in binOps) {
				getFromStackApplyAndPush(binOps[str[i]], 2);
			} else if (str[i] in unOps) {
				getFromStackApplyAndPush(unOps[str[i]], 1);
			} else if (str[i] in vars) {
				stack.push(new Variable(str[i]));
			} else {
				stack.push(new Const(parseInt(str[i])));
			}
		}
	};
	return stack.pop();
}

function parsePrefix(str) {
	function findOp(op) {
		for (var i in allOperators) {
			if (op in allOperators[i]) {
				return allOperators[i][op];
			};
		};
	}

	function parseToken() {
		var token = tokens[index];
		if (token in vars) {
			return new Variable(token)
		} else if (isValidNumber(token)) {
			return new Const(parseInt(token));
		} else if (token == "(") {
			return parsePrefixRecursive();
		} else {
			throw new ParseError("unexpected token " + token)
		}
	}

	function parsePrefixRecursive() {
		index++;
		var opArgs = [findOp(tokens[index])];
		if (!opArgs[0]) {
			throw new ParseError(tokens[index] + " is not a valid operator");
		}
		index++;
		for (; index < tokens.length; index++) {
			if (tokens[index] == ")") {
				return new (opArgs[0].bind.apply(opArgs[0], opArgs))
			} else {
				opArgs.push(parseToken(opArgs));
			}
		}
		throw new ParseError("missing closing bracket")
	}

	function isValidNumber(str) {
		if (!isNaN(str) && !(str[0] == "+")) {
			return true;
		}
	}

	function ParseError(message) {
		this.name = "ParseError";
		this.message = message;
	}
	ParseError.prototype = Object.create(Error.prototype);

	var tokens = str.match(/[^\s()]+|[()]/g);
	var index = 0;
	if (tokens == null) {
		throw new ParseError("no valid tokens");
	} else {
		var res = parseToken();
		index++;
		if (index < tokens.length) {
			throw new ParseError("Unexpected end of string")
		}
		return res;
	}
}
