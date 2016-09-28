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

	return function(opName, calculate, diff, simplify) {
		var op = function() {
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

function Const(val) {
	this.val = val;
}
Const.prototype = {
	"evaluate": function() {
		return this.val;
	},
	"toString":  function() {
		return this.val.toString();
	},
	"diff": function() {
		return new Const(0);
	},
	"simplify": function() {
		return this;
	}
}

function Variable(x) {
	this._x = x;
}
Variable.prototype = {
	"evaluate": function() {
		return arguments[vars[this._x]];
	},
	"toString":  function() {
		return this._x.toString();
	},
	"diff": function(x) {
		var val;
		if (x == this._x) {
			val = 1;
		} else {
			val = 0;
		}
		return new Const(val);
	},
	"simplify": function() {
		return this;
	}
}

function checkConst(a, val, res) {
	if (a instanceof Const && a.evaluate() == val) {
		return res;
	}
}

function testSimplify() {
	var x;
	for (var i = 0; i < arguments.length; i++) {
		if (arguments[i]) {
			return arguments[i];
		}
	}
	return this;
}

var constZero = new Const(0);

var Add = operators("+",
	function(a, b){return a + b},
	function(args, argsDiffed){return new Add(argsDiffed[0], argsDiffed[1])},
	function (a, b) {
		return testSimplify.call(this, checkConst(a, 0, b), checkConst(b, 0, a))
	}
);
var Subtract = operators("-",
	function(a, b){return a - b},
	function(args, argsDiffed){return new Subtract(argsDiffed[0], argsDiffed[1])},
	function(a, b) {
		return testSimplify.call(this, checkConst(a, 0, new Negate(b)), checkConst(b, 0, a))
	}
);
var Multiply = operators("*",
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
			checkConst(a, 0, constZero),
			checkConst(b, 0, constZero)
		)
	}
);
var Divide = operators("/",
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
		return testSimplify.call(this, checkConst(a, 0, constZero),
								checkConst(b, 1, a),
								checkConst(b, 0, new Const(Infinity)))
	}
);
var Negate = operators("negate",
	function(a){return -a},
	function(args, argsDiffed){return new Negate(argsDiffed[0])},
	function() {return this}
);
var Sin = operators("sin",
	Math.sin,
	function(args, argsDiffed){ return new Multiply(new Cos(args[0]), argsDiffed[0]) },
	function() {return this}
);
var Cos = operators("cos",
	Math.cos,
	function(args, argsDiffed) {return new Multiply(new Negate(new Sin(args[0])), argsDiffed[0])},
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
};

var vars = {
	"x": 0,
	"y": 1,
	"z": 2,
}

function parse(str) {
	function getFromStackApplyAndPush(obj, times) {
		var args = [];
		for (var i = 0; i < times; i++) {
			args.unshift(stack.pop());
		}
		args.unshift(obj);
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

// println(parse('4 z *').diff('x').simplify())