---
layout:         post
title:          Introduction to Compiler
subtitle:       CompilerConstruction01
date:           2020-01-13
author:        Miangu
catalog:       true
tags:
    - Compiler
    - English
    - CourseNotes
---

## Introduction

This series is a collection of notes of the course **Compiler Construction** delivered at University of Michigan in Winter 2020. The textbook used is *Engineering a Compiler* from Rice University and the hands-on project will deal with Decaf as source language, MIPS as target language and implemented in C++. Decaf is a custom programming language similar to Java or C++ with simplified feature set. It is also objected-oriented, inheritance-enabled and it impose strong type

## What is a compiler

As an overview, compilers are computer programs that translate a program written in one language into a program written in another language, typically to a lower level of abstraction like machine code, e.g. $\text{C/C++}\to\text{X86}$.

At the same time, higher level abstractions tend to lead to more inefficiency. So, we expect the program produced in lower level language to be better (run faster, consume less memory, etc.). 

In programming, we can sometimes encounter something called interpreter. The job of a compiler and that of an interpreter overlaps a lot. The major difference is that compilers output a program but interpreters emits results of the program.

![image-20200113170401084](/img/2020011301.png)

Some languages like C/C++ uses compilers, some other languages like python uses interpreters and some yet other ones like Java may adopt a scheme that involves both.

## Structure of a Modern Compiler

Modern compilers are usually three-phased.

![image-20200113171414632](/img/2020011302.png)

By introducing an intermediate language representation (IR), the front end pass is assured static which deals with language-specific properties of the source and the back end can be tailored for different hardware specifications. In this way, the IR code can be portable.

The front end pass usually involves (1) lexical analysis (aka scanning), (2) syntax analysis (aka parsing), (3) semantic analysis (sometimes known as elaborating) and (4) IR generation, while the back end pass includes (1) target language generation and (2) further optimization in the target language (include register allocation, instruction selection, etc).

*Comments*: In the context of this course, we often treat optimizer as a part of back end.

![image-20200113173738182](/img/2020011303.png)

The above picture from the textbook omits the target language code generation step in the back end part in that it is assumed to be done while selecting instructions.

Taking the following C code for example

```C
while (y < z)
{
	int x = a + b;
	y += x;
}
```

we will briefly illustrate what these inner steps stand for.

#### Lexical analysis (Scanning)

In this step, the compiler scan the source code and group sequence of characters into lexemes, i.e. the smallest meaningful entities in the source language like keywords, identifiers, constants, etc. 

For the C code in our example, lexical analysis will find lexemes like to following:

$$
\tt {T\_While\\
T\_LeftParen\\
T\_Identifier y\\
T\_Less\\
T\_Identifier z\\
T\_RightParen\\
T\_OpenBrace\\
T\_Int\\
T\_Identifier x\\
T\_Assign\\
T\_Identifier a\\
T\_Plus\\
T\_Identifier b\\
T\_Semicolon\\
T\_Identifier y\\
T\_PlusAssign\\
T\_Identifier x\\
T\_Semicolon\\
T\_CloseBraceach}
$$

#### Syntax analysis (Parsing)

In this step, the compiler identifies how the lexemes relate to reach. More specifically, the compiler convert the linear structure of the lexeme sequence into an abstract syntax tree (AST), which is a hierarchical tree structure.

Programming languages are context free, so you can refer to the context free grammar (CFG) related information covered in the **Natural language processing** course for an analogy of how an AST is generated.

For the C code in our example, the generated AST will look somewhat like the following:

![image-20200113174140739](/img/2020011304.png)

This is where syntax errors are reported for instance

```C
int *foo (i, j, k))			# Extra paraentheses
{
    int x;
	for (i = 0; i j) {		# (1) "i j" is not an expression; (2) Missing increment
		fi (i > N)		# "fi" is not a keyword
			return i + x;
	}
}
```

#### Semantic analysis (Elaboration)

In this step, the compiler checks further rules of the source language like type checking. For instance

```C
int *foo (i, j, k))			# Input type undeclared
{
	for (i = 0; i j) {
		fi (i > N)		# Undeclared variable "N"
			return i + x;	# (1) Mismatched return type; (2) Uninitialized variable "x" used
	}
}
```

#### IR generation

This is where the IR codes are generated. For our example, the output could be like

```assembly
Loop:	x = a + b
	y = x + y
	_t1 = y < z
	if _t1 goto Loop
```

#### IR optimization

For example a naïve optimization could yield

```assembly
	x = a + b
Loop:	y = x + y
	_t1 = y < z
	if _t1 goto Loop
```

which saves the effort to calculate the unchanged $x$ every time in the loop.

#### Target language generation (instruction selection)

The IR is translated to the native code of the machine. For our example, the output could be

```assembly
	add $1, $2, $3
Loop:	add $4, $1, $4
	slt $6, $1, $5
	beq $6, Loop
```

#### Target language optimization

This part is also known as the machine dependent optimization. It can often involve register allocation, peephole, etc.

*Comments*: Modern compilers can be descripted as

+ Matured frontend
+ Heavy backend that has many passes of optimization

### Architecture of GNU Compiler Collection (GCC)

In GCC, many IRs are used; the AST will undergo the translation of GENERIC$\to$High GIMPLE$\to$SSA$\to$Low GIMPLE$\to$RTL before the machine code is finally generated. 

### Architecture of Low Level Virtual Machine (LLVM)

LLVM, developed in UIUC (2020), adopts a "language0agnostic" design based on its LLVM IR.

![image-20200113183022576](/img/2020011305.png)