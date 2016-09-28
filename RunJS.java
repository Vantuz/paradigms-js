import javax.script.*;
import java.io.*;

public class RunJS {
    public static class IO {
        private final ScriptEngine engine;
        public IO(ScriptEngine engine) {
            this.engine = engine;
        }

        public void print(String[] messages) {
            for (int i = 0; i < messages.length; i++) {
                if (messages[i] != null) {
                    if (i > 0) {
                        System.out.print(" ");
                    }
                    System.out.print(messages[i]);
                }
            }
        }

        public void println(String[] messages) {
            print(messages);
            System.out.println();
        }

        public void include(String file) throws Exception {
            engine.eval(new InputStreamReader(new FileInputStream(file), "UTF-8"));
        }
    }
    public static void main(String[] args) throws ScriptException, IOException {
        ScriptEngineManager factory = new ScriptEngineManager();
        ScriptEngine engine = factory.getEngineByName("JavaScript");
        engine.put("io", new IO(engine));
        engine.eval(
            "var toArray = function(args){ return Array.prototype.map.call(args, function (a) { return '' + a})}; "+
            "var println = function() { io.println(toArray(arguments)); };" + 
            "var print   = function() { io.print  (toArray(arguments)); };" +
            "var include = function(file) { io.include(file); }"
        );

        engine.eval(new InputStreamReader(new FileInputStream("script.js"), "UTF-8"));
    }
}