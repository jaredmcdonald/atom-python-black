"use babel";

import { CompositeDisposable, BufferedProcess } from "atom";

export default {
  config: {
    fmtOnSave: {
      type: "boolean",
      default: true,
      title: "Format on save"
    },
    lineLength: {
      type: "integer",
      // default is set to 88 in black; don't set a default here because it will override
      // configuration in pyproject.toml
      minimum: 1,
      title: "Maximum line length"
    },
    binPath: {
      type: "string",
      default: "black",
      title: "Path to the black executable"
    },
    skipStringNormalization: {
      type: "boolean",
      default: false,
      title: "Skip string normalization"
    },
    skipNumericUnderscoreNormalization: {
      type: "boolean",
      default: false,
      title: "Skip numeric underscore normalization"
    }
  },
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.workspace.observeTextEditors(textEditor => {
        if (textEditor.getGrammar().scopeName == "source.python") {
          this.subscriptions.add(
            textEditor.onDidSave(event => {
              if (atom.config.get("python-black.fmtOnSave")) {
                this.formatFile(event.path);
              }
            })
          );
        }
      })
    );

    this.subscriptions.add(
      atom.commands.add(
        'atom-text-editor[data-grammar="source python"]',
        "python-black:format",
        () => {
          this.formatEditor(atom.workspace.getActiveTextEditor());
        }
      )
    );

    this.subscriptions.add(
      atom.commands.add(
        "atom-workspace",
        "python-black:toggle-format-on-save",
        () => {
          atom.config.set(
            "python-black.fmtOnSave",
            !atom.config.get("python-black.fmtOnSave")
          );
        }
      )
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  handleError(err) {
    atom.notifications.addError("Black failed to reformat 💥 💔 💥", {
      detail: err,
      dismissable: true
    });
  },

  loadArgs() {
    const args = ["-q"];
    if (typeof atom.config.get("python-black.lineLength") === "number") {
      args.push("-l");
      args.push(atom.config.get("python-black.lineLength"));
    }
    if (atom.config.get("python-black.skipStringNormalization")) {
      args.push("-S");
    }
    if (atom.config.get("python-black.skipNumericUnderscoreNormalization")) {
      args.push("-N");
    }
    return args;
  },

  formatFile(file) {
    const args = this.loadArgs();
    args.push(file);

    new BufferedProcess({
      command: atom.config.get("python-black.binPath"),
      args: args,
      stderr: err => {
        this.handleError(err);
      }
    });
  },

  formatEditor(textEditor) {
    const args = this.loadArgs();
    args.push("-"); // Set black to read from stdin

    bp = new BufferedProcess({
      command: atom.config.get("python-black.binPath"),
      args: args,
      stdout: out => {
        textEditor.setText(out);
      },
      stderr: err => {
        this.handleError(err);
      }
    });
    bp.process.stdin.write(textEditor.getText());
    bp.process.stdin.end();
  }
};
