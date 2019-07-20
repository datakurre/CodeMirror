"use strict";
/*
  Copyright (c) 2018 Georgia Tech Research Corporation
  Copyright (c) 2019 Asko Soukka <asko.soukka@iki.fi>
  Distributed under the terms of the BSD-3-Clause License
*/
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
  An implementation of syntax highlighting for robot framework 3.1.

  http://robotframework.org/robotframework/3.1/RobotFrameworkUserGuide.html

  When necessary, the source code is consulted and ultimately trusted:

  https://github.com/robotframework/robotframework
*/
// tslint:disable-next-line
/// <reference path="../typings/codemirror/codemirror.d.ts"/>
// tslint:disable-next-line
var CodeMirror = require("../../lib/codemirror");
require("../../addon/mode/simple");
/** the tokens we use */
var TT;
(function (TT) {
    TT["AM"] = "atom";
    TT["AT"] = "attribute";
    TT["BE"] = "builtin.em";
    TT["BI"] = "builtin";
    TT["BK"] = "bracket";
    TT["CM"] = "comment";
    TT["DF"] = "def";
    TT["HL"] = "header";
    TT["KW"] = "keyword";
    TT["MT"] = "meta";
    TT["NB"] = "number";
    TT["OP"] = "operator";
    TT["PC"] = "punctuation";
    TT["PR"] = "property";
    TT["SE"] = "string.em";
    TT["SH"] = "string.header";
    TT["SS"] = "string.strong";
    TT["SSE"] = "string.strong.em";
    TT["S2"] = "string-2";
    TT["ST"] = "string";
    TT["TG"] = "tag";
    TT["V2"] = "variable-2";
})(TT = exports.TT || (exports.TT = {}));
function LINK(token) {
    return (token + '.link');
}
exports.LINK = LINK;
/** helper function for compactly representing a rule */
function r(regex, token, opt) {
    return __assign({ regex: regex, token: token }, opt);
}
/** Possible Robot Framework table names. Group count is important.  */
var TABLE_NAMES = {
    keywords: /(\|\s)?(\*+ *)(user keywords?|keywords?)( *\**)/i,
    settings: /(\|\s)?(\*+ *)(settings?)( *\**)/i,
    test_cases: /(\|\s)?(\*+ *)(tasks?|test cases?)( *\**)/i,
    variables: /(\|\s)?(\*+ *)(variables?)( *\**)/i
};
/** Enumerate the possible rules  */
var RULES_TABLE = Object.keys(TABLE_NAMES).map(function (next) {
    return r(TABLE_NAMES[next], [TT.BK, TT.HL, TT.HL, TT.HL], {
        next: next,
        sol: true
    });
});
var RULE_COMMENT_POP = r(/#.*$/, TT.CM, { pop: true });
/** Valid python operators */
var VAR_OP = /[*\-+\\%&|=><!]/;
/** Valid python numbers */
var VAR_NUM = /0(b[01]+|o[0-7]+|x[0-9a-f]+)|(\d+)(\.\d+)?(e-?(\d+)(\.\d+)?)?/i;
/**
    Valid python builtins
    Valid  way out at the end is a lookahead for VAR_OP, end or .
*/
var VAR_BUILTIN = /(none|(cur|temp|exec)dir|\/|:|\\n|true|empty|false|null|space|test (name|documentation|status|message|tags)|prev test (name|status|message)|suite (name|source|documentation|status|message|metadata)|keyword (status|message)|(report|debug) file|log (file|level)|output (dir|file))(?=[.}]|\s+[*\-+\\%&|=><!])/i;
/** a rule for the beginning of the variable state */
var RULE_VAR_START = r(/[\$&@%]\{/, TT.V2, { push: 'variable' });
/** a rule for the end of the variable state */
var RULE_VAR_END = r(/\}/, TT.V2);
/** a rule for a number */
var RULE_NUM = r(VAR_NUM, TT.NB);
/** a rule for starting a single quote */
var RULE_SINGLE_STRING_START = r(/'/, TT.ST, { push: 'single_string' });
/** a rule for starting a double quote */
var RULE_DOUBLE_STRING_START = r(/"/, TT.ST, { push: 'double_string' });
/** a rule for capturing tags (and friends) in keyword/test/task definitions */
var RULE_TAGS = r(/([|\s]*\s*)(\[\s*)(tags)(\s*\])(\s*\|?)/i, [TT.BK, TT.MT, TT.MT, TT.MT, TT.BK], { sol: true, push: 'tags' });
/** rule for special case of applying tags at the suite level */
var RULE_SUITE_TAGS = r(/(force tags|default tags)(\t+|  +)/i, [TT.MT, null], {
    push: 'tags',
    sol: true
});
/** rule for special case of applying tags at the suite level (with pipes) */
var RULE_SUITE_TAGS_PIPE = r(/(\| +)(force tags|default tags)( *\|?)/i, [TT.BK, TT.MT, TT.BK], { sol: true, push: 'tags' });
/** rule for bracketed settings of keyword/test/task */
var RULE_SETTING_KEYWORD = r(/([|\s]*)(\[\s*)(setup|teardown|template)(\s*\])(\s*\|?)/i, [TT.BK, TT.MT, TT.MT, TT.MT, TT.BK], { push: 'keyword_invocation_no_continue', sol: true });
/** rule for bracketed settings of keyword/test/task that include a keyword */
var RULE_SUITE_SETTING_KEYWORD = r(/(suite setup|suite teardown|test setup|test teardown|test template|task setup|task teardown|task template)(\t+|  +)/i, [TT.MT, null], { push: 'keyword_invocation', sol: true });
/** rule for bracketed settings of keyword/test/task that include a keyword (with pipes) */
var RULE_SUITE_SETTING_KEYWORD_PIPE = r(/(\| +)(suite setup|suite teardown|test setup|test teardown|test template|task setup|task teardown|task template)( +\|)/i, [TT.BK, TT.MT, TT.BK], { push: 'keyword_invocation', sol: true });
var RULE_SETTING_LIBRARY = r(/(library)(\t+|  +)/i, [TT.MT, null], {
    push: 'library',
    sol: true
});
var RULE_SETTING_LIBRARY_PIPE = r(/(\| +)(library)( +\|)/i, [TT.BK, TT.MT, TT.BK], {
    push: 'library',
    sol: true
});
/** rule to escape the final closing bracket of a var at the end of a line */
var RULE_LINE_ENDS_WITH_VAR = r(/\}\s*(?=$)/, TT.V2, { pop: true });
var RULE_ELLIPSIS = r(/(\s*)(\.\.\.)/, [null, TT.BK], { sol: true });
var RULE_NOT_ELLIPSIS_POP = r(/(?!\s*(\\|\.\.\.))/, null, {
    pop: true,
    sol: true
});
var RULE_DOC_TAGS = r(/(Tags:)(\s*)/i, [TT.MT, null], { push: 'tags_comma' });
/** collects the states that we build */
var states = {};
/** base isn't a state. these are the "normal business" that any state might use */
var base = RULES_TABLE.concat([
    RULE_VAR_START,
    RULE_VAR_END,
    RULE_DOC_TAGS,
    RULE_ELLIPSIS,
    r(/\|/, TT.BK),
    r(/#.*$/, TT.CM),
    r(/\\ +/, TT.BK),
    r(/\\(?=$)/, TT.BK),
    r(
    // a non-variable argument fragment before a variable before an equal
    /([^\s\$@&%=]((?!\t+|\s+\|\s+|  +)([^=]|\\=))*?)(?=[$@&%].*?[^ =\\]=($|  |[^=]|\s+\||\t))/, TT.AT),
    r(
    // a non-variable argument fragment before an equal
    /([^\s\$@&%=]((?!\t+|\s+\|\s+|  +)([^=]|\\=))*?)(?==($|  |[^=]|\s+\||\t))/, TT.AT),
    r(/[^\s]+:(?!\/)/, TT.OP),
    r(/(=!<>+\-*\/%)*==?/, TT.OP),
    r(/_\*.*?\*_/, TT.SSE),
    r(/\*.*?\*/, TT.SS),
    r(/\_.*?\_/, TT.SE),
    // this is pretty extreme, but seems to work
    r(/[^\s\$@%&]+/, TT.ST),
    r(/[\$@%&](?!\{)/, TT.ST)
]);
/** the starting state (begining of a file) */
states.start = [
    r(/(%%python)( module )?(.*)?/, [TT.MT, TT.KW, TT.V2], {
        mode: { spec: 'ipython' },
        sol: true
    }),
    r(/(%%[^\s]*).*$/, TT.MT, { sol: true })
].concat(base);
/** settings states */
states.settings = [
    RULE_SUITE_TAGS_PIPE,
    RULE_SUITE_TAGS,
    RULE_SUITE_SETTING_KEYWORD_PIPE,
    RULE_SUITE_SETTING_KEYWORD,
    RULE_SETTING_LIBRARY,
    RULE_SETTING_LIBRARY_PIPE,
    r(/(\|*\s*)(resource|variables|documentation|metadata|test timeout|task timeout)(\s*)/i, [TT.BK, TT.MT, null], { sol: true })
].concat(base);
states.library = [
    RULE_NOT_ELLIPSIS_POP,
    RULE_ELLIPSIS,
    RULE_LINE_ENDS_WITH_VAR,
    r(/(WITH NAME)(\t+|  +| +\| +)([^\|\s]*)(\s*)(\|?)(\s*)(?=$)/, [TT.AM, TT.BK, TT.DF, null, TT.BK, null], {
        pop: true
    })
].concat(base);
/** rule for behavior-driven-development keywords */
var RULE_START_BDD = r(/(\|\s*\|\s*|\s\s+)?(given|when|then|and|but)/i, [TT.BK, TT.BE], {
    push: 'keyword_invocation',
    sol: true
});
/** rule for whitespace keywords */
var RULE_KEY_START = r(/(\t+|  +)(?!\.\.\.)/, null, {
    push: 'keyword_invocation',
    sol: true
});
/** rule for pipe keywords */
var RULE_KEY_START_PIPE = r(/(\| )(\s*)(|[^\|\s][^\|]*)(\s*)( \|)(\s+)/, [TT.BK, null, TT.SH, null, TT.BK, null], {
    push: 'keyword_invocation',
    sol: true
});
/** rule for for old-style loops (slashes) */
var RULE_START_LOOP_OLD = r(/(\s\|*\s*)(:FOR)(\s\|*\s*)/, [null, TT.AM, null], {
    push: 'loop_start_old',
    sol: true
});
/** rule for for new-style loops (slashes) */
var RULE_START_LOOP_NEW = r(/(\s\|*\s*)(FOR)(\s\|*\s*)/, [null, TT.AM, null], {
    push: 'loop_start_new',
    sol: true
});
var RULES_TAGS_COMMON = [
    r(/\s\|\s*/, TT.BK),
    RULE_COMMENT_POP,
    RULE_ELLIPSIS,
    RULE_NOT_ELLIPSIS_POP,
    RULE_VAR_START,
    RULE_LINE_ENDS_WITH_VAR,
    RULE_VAR_END,
    r(/ +/, null)
];
/** rules for capturing individual tags */
states.tags = RULES_TAGS_COMMON.concat([
    r(/[^\$&%@]*?(?=(  +| \|))/, TT.TG),
    // fall back to single char
    r(/[^\$&%@|]/, TT.TG)
]);
/** rules for capturing tags inside docs */
states.tags_comma = RULES_TAGS_COMMON.concat([
    r(/(,)(\s*)/, [TT.PC, null]),
    r(/[^\$&%@,]+(?=,$)/, TT.TG),
    // fall back to single char
    r(/[^\$&%@|,]/, TT.TG)
]);
/** need to catch empty white lines pretty explicitly */
var RULE_WS_LINE = r(/\s*(?=$)/, null, { sol: true });
/** not a state. rules for starting keyword invocation */
var RULES_KEYWORD_INVOKING = [
    RULE_START_BDD,
    RULE_KEY_START_PIPE,
    RULE_KEY_START,
    r(/\|\s(?=[^\s*]*\|)/, null, { sol: true, push: 'keyword_invocation' }),
    r(/(?=[^\s*])/, null, { sol: true, push: 'keyword_invocation' })
];
var RULE_SETTING_SIMPLE = r(/(\t+|  +)(\[\s*)(arguments|documentation|return|timeout)(\s*\])(\s*)/i, [null, TT.MT, TT.MT, TT.MT, null], { sol: true });
var RULE_SETTING_SIMPLE_PIPE = r(/(\|)(\s+)([^|*]*)(\s+)(\|)(\s+)(\[\s*)(arguments|documentation|return|timeout)(\s*\])(\s*)(\|?)/i, [TT.BK, null, TT.SH, null, TT.BK, null, TT.MT, TT.MT, TT.MT, null, TT.BK], { sol: true });
/** rules for data rows inside a keyword table */
states.keywords = [
    RULE_ELLIPSIS,
    RULE_TAGS,
    RULE_SETTING_KEYWORD,
    RULE_SETTING_SIMPLE,
    RULE_SETTING_SIMPLE_PIPE,
    r(/(?=[^\s$&%@*|]+)/, null, { sol: true, push: 'keyword_def' }),
    RULE_START_LOOP_OLD,
    RULE_START_LOOP_NEW,
    RULE_WS_LINE
].concat(RULES_KEYWORD_INVOKING, base);
/** a keyword name fragment before an inline variable */
var KEYWORD_WORD_BEFORE_VAR = /([^\s]*?(?=[\$&%@]\{))/i;
/** a keyword name fragment before a separator */
var KEYWORD_WORD_BEFORE_SEP = /[^\s\|]+(?=$|[|]|\t|  +)/;
/** a keyword name fragment before a non-separator whitespace character */
var KEYWORD_WORD_BEFORE_WS = /([^\n\$\s*=\|]+?(?= ))/i;
states.keyword_def = [
    RULE_VAR_START,
    RULE_LINE_ENDS_WITH_VAR,
    RULE_VAR_END,
    r(/ /, null),
    r(KEYWORD_WORD_BEFORE_VAR, TT.DF),
    r(KEYWORD_WORD_BEFORE_SEP, TT.DF, { pop: true }),
    r(KEYWORD_WORD_BEFORE_WS, TT.DF),
    r(/(?=$)/, null, { sol: true, pop: true })
];
/** A range as used in for loops */
var RULE_RANGE = r(/([\|\s]*\s*)(IN)( RANGE| ENUMERATE| ZIP)?/, [
    null,
    TT.AM,
    TT.AM
]);
states.loop_start_new = [
    RULE_RANGE,
    r(/[.]{3}/, TT.BK),
    RULE_VAR_START,
    r(/\}(?=$)/, TT.V2),
    RULE_VAR_END,
    r(/([\|\s]*\s*)(END)/, [null, TT.AM], { sol: true, pop: true }),
    RULE_WS_LINE
].concat(RULES_KEYWORD_INVOKING, base);
states.loop_start_old = [
    r(/(?=.*)/, null, { sol: true, next: 'loop_body_old' }),
    RULE_RANGE,
    RULE_VAR_START,
    r(/\}(?=$)/, TT.V2),
    RULE_VAR_END
].concat(base);
states.loop_body_old = RULES_KEYWORD_INVOKING.map(function (rule) {
    return __assign({}, rule, { regex: new RegExp(/([\|\s]*\s*)(\\)/.source +
            (rule.regex instanceof RegExp ? rule.regex.source : rule.regex)), token: rule.token instanceof Array
            ? [null, TT.BK].concat(rule.token) : [null, TT.BK, rule.token] });
}).concat([
    r(/(?=\s+[^\\])/, null, { pop: true, sol: true })
], base);
var RULE_CASE_SETTING_SIMPLE = r(/(\t+|  +)(\[\s*)(documentation|timeout)(\s*\])(\s*)/i, [null, TT.MT, TT.MT, TT.MT, null], { sol: true });
var RULE_CASE_SETTING_SIMPLE_PIPE = r(/(\|)(\s+)([^|*]*)(\s+)(\|)(\s+)(\[\s*)(documentation|timeout)(\s*\])(\s*)(\|?)/i, [TT.BK, null, TT.SH, null, TT.BK, null, TT.MT, TT.MT, TT.MT, null, TT.BK], { sol: true });
/** rules for data rows inside test/task definition */
states.test_cases = RULES_TABLE.concat([
    RULE_WS_LINE,
    RULE_ELLIPSIS,
    RULE_TAGS,
    RULE_SETTING_KEYWORD,
    RULE_CASE_SETTING_SIMPLE,
    RULE_CASE_SETTING_SIMPLE_PIPE,
    RULE_START_LOOP_OLD,
    RULE_START_LOOP_NEW,
    r(/([^|\s*].+?)(?=(\t|  +|$))/, TT.SH, { sol: true })
], RULES_KEYWORD_INVOKING, [
    r(/(\|\s+)([^\s*\|\.][^\|]*?)(\s*)(\|?$)/, [TT.BK, TT.SH, TT.BK], {
        sol: true
    }),
    r(/(\| +)([^\|\s].+?)(\s*)( \| )/, [TT.BK, TT.SH, null, TT.BK], {
        sol: true
    })
], base);
/** rules for inside of an invoked keyword instance */
states.keyword_invocation = [
    r(/( ?)(=)(\t+|  +|\s+\|)/, [null, TT.OP, null]),
    r(/(?=\s*$)/, null, { pop: true }),
    r(/(\\|\.\.\.) +/, TT.BK, { pop: true }),
    RULE_VAR_START,
    RULE_LINE_ENDS_WITH_VAR,
    RULE_VAR_END,
    RULE_COMMENT_POP,
    r(/( \| |  +|\t+)(?=[$@&])/, TT.BK),
    r(/( \| |  +|\t+)/, TT.BK, { pop: true }),
    r(/ /, null),
    r(KEYWORD_WORD_BEFORE_VAR, TT.KW, { pop: true }),
    r(KEYWORD_WORD_BEFORE_SEP, TT.KW, { pop: true }),
    r(KEYWORD_WORD_BEFORE_WS, TT.KW)
].concat(base);
states.keyword_invocation_no_continue = [
    RULE_NOT_ELLIPSIS_POP
].concat(states.keyword_invocation);
/** curious rule for the variables table */
states.variables = base.slice();
/** rules for inside of a variable reference */
states.variable = [
    RULE_VAR_START,
    r(VAR_BUILTIN, TT.BI),
    RULE_NUM,
    r(VAR_OP, TT.OP),
    r(/(:)(.*?[^\\])(?=\}\s*$)/, [TT.OP, TT.S2], { pop: true }),
    r(/(:)(.*?[^\\])(?=\})/, [TT.OP, TT.S2]),
    r(/\./, TT.OP, { push: 'variable_property' }),
    r(/\[/, TT.BK, { next: 'variable_index' }),
    r(/\}(?=\[)/, TT.V2),
    r(/(?=\}\s*$)/, null, { pop: true }),
    r(/\}/, TT.V2, { pop: true }),
    r(/[^\{\}\n:]/, TT.V2)
];
/** rules for extended syntax in a variable reference */
states.variable_property = [
    RULE_VAR_START,
    RULE_VAR_END,
    RULE_NUM,
    RULE_SINGLE_STRING_START,
    RULE_DOUBLE_STRING_START,
    r(VAR_OP, TT.OP),
    r(/\(/, TT.BK),
    r(/\)/, TT.BK, { pop: true }),
    r(/([a-z_][a-z_\d]*)(=)/i, [TT.V2, TT.OP]),
    r(/,/, TT.PC),
    r(/[^}](?=\})/, TT.PR, { pop: true }),
    r(/(\})(\s*(?=$|\n))/, [TT.BK, null], { pop: true }),
    r(/\t*(?=$|\n)/, null, { pop: true }),
    r(/[^}]/, TT.PR)
];
/** rules for strings with single quotes */
states.single_string = [
    r(/\\'/, TT.ST),
    r(/'/, TT.ST, { pop: true }),
    r(/./, TT.ST)
];
/** rules for strings with double quotes */
states.double_string = [
    r(/\\"/, TT.ST),
    r(/"/, TT.ST, { pop: true }),
    r(/./, TT.ST)
];
/** rules for square-bracketed index referencing */
states.variable_index = [
    RULE_VAR_START,
    RULE_VAR_END,
    RULE_NUM,
    r(/\[/, TT.BK),
    r(/\](?=\])/, TT.BK),
    r(/(\])(\})( ?=?)/, [TT.BK, TT.V2, TT.OP], { pop: true }),
    r(/(\])(\[)/, TT.BK),
    r(/\]/, TT.BK, { pop: true }),
    r(/[^\]]/, TT.ST)
];
/** well-known mime type for robot framework (pygments, etc.) */
exports.MIME_TYPE = 'text/x-robotframework';
/** the canonical CodeMirror mode name */
exports.MODE_NAME = 'robotframework';
/** the human-readable name of the CodeMirror mode */
exports.MODE_LABEL = 'robotframework';
/** primary file extension */
exports.DEFAULT_EXTENSION = 'robot';
/** all recognized file extensions */
exports.EXTENSIONS = [exports.DEFAULT_EXTENSION, 'resource'];
/** the actual exported function that will install the mode in CodeMirror */
function defineRobotMode() {
    var _CodeMirror = CodeMirror;
    _CodeMirror.defineSimpleMode(exports.MODE_NAME, __assign({ meta: {
            dontIndentStates: ['comment'],
            lineComment: '#'
        } }, states));
    CodeMirror.defineMIME(exports.MIME_TYPE, exports.MODE_NAME);
    CodeMirror.modeInfo.push({
        ext: exports.EXTENSIONS,
        mime: exports.MIME_TYPE,
        mode: exports.MODE_NAME,
        name: exports.MODE_LABEL
    });
}
exports.defineRobotMode = defineRobotMode;
/** install the mode */
defineRobotMode();
