---
layout:         post
title:          Lexical Analysis
subtitle:       CompilerConstruction02
date:           2020-01-17
author:        Miangu
catalog:       true
tags:
    - Compiler
    - English
    - CourseNotes
---

## Lexical Analysis

### Goal

Breaking program source code into lexemes and in turns "tokens". 

+ Input: code (as character stream)
+ Output: token streams

For example, consider the source code stream

![image-20200117190035099](/img/2020011702.png)

and corresponding output token stream

![image-20200117185901055](/img/2020011701.png)

### Lexeme/Token type

Lexemes stand for the actual text of the tokens. For each lexeme, the scanner identifies the token type and the attribute that comes along, i.e. `<token type, [attribute]>`.

For each type, we list some `C` instances of the type for illustration use:

+ Keyword: `for`, `int`, `if`, `else`, etc.
+ Punctuation: `(`, `)`, `{`. `}`, `;`, etc.
+ Operand: `+`, `-`, `++`, etc.
+ Relation: `<`, `>`, etc.
+ Identifier: (variable name, function name) `foo`, `foo_2`, etc.
+ Integer, floating point, string: `123`, `4.5`, `"hello world"`, etc.
+ Whitespace, comment: ` `, `/*the code is awesome*/`, etc.

Attribute is optional; it stores extra information beyond the token type, like the identifier name `ip` in the example above.

### Major difficulties

The following C++ statements are not necessarily syntactically correct, but the syntax errors are not known to a scanner and it should provide proper token stream as output.

```c++
std::vector<std::vector<int>> myVec;
std::vector < std::vector < int >> myVec;
std::(vector < (std::vector < (int >> myVec)))
```

The major difficulty of scanning comes from

+ How do we determine which lexemes are associated with each token?
+ When there are multiple ways we could scan the input, how do we know which one to pick?
+ How do we address these concerns efficiently?

#### Associate lexemes to tokens

For keywords, punctuations, operands and relations, there are only finite possible lexemes; while for the rest of the types (identifiers, integers, etc.) there are infinite possible lexeme associated to them.

To describe a potentially infinite set of lexemes as associated with a token type, we can use a formal language e.g. RegEx

#### Regular expression (RegEx)

RegEx is powerful in matching patterns in strings. For example

+ Whitespaces: `[\t\n]+`
+ Integers (`T_INT+CONST`): `[+\-]?[0-9]+`
+ Hex numbers (`T_INT_HEX_CONST`): `0x[0-9a-f]+`
+ ......

To recognize language defined by an RegEx, typically we will use (non-)deterministic finite automata.

The overview of using RegEx for scanning is illustrated in the following picture.

![image-20200117200541427](/img/2020011703.png)

+ RE$\to$NFA:(Thompson's construction)
  + Build an NFA for each term
  + Combine them with $\varepsilon$-moves
+ NFA$\to$DFA:(subset construction)
+ DFA$\to$Minimal DFA:(Hopcroft's algorithm)

You can turn to *Mastering Regular Expression* for detailed explanation of how a RegEx engine works and how to design it. However, we are going to use the application `flex` instead in this course to save the effort.

#### Lexing ambiguities

For example the following 2 lexical specifications:

```
T_For		for
T_Identifier	[A-Za-z_][A-Za-z0-9]*
```

To resolve conflicts

+ Left-to-Right scan
+ Priority: A simple priority system could be always picking the rule that was defined first.
+ Maximal munch: Always match the longest possible prefix of the remaining text.

The first project in this course will be implementing a scanner with flex. The link to it will be added here upon finish.