#!/usr/bin/env python3
"""Сборка index.html: p1.html (разметка и CSS) + p2.js (данные баланса DEF) + p3.js (движок) + m2fx.js (эффекты из M2).
Запуск из корня репозитория: python3 src/build.py  ->  index.html (версия берётся из version.txt)."""
import os, time
d = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(d)
rd = lambda f: open(os.path.join(d, f), encoding="utf-8").read()
p3 = rd("p3.js").replace("/* ================= ЭФФЕКТЫ ================= */", rd("m2fx.js") + "\n/* ================= ЭФФЕКТЫ ================= */")
p3 = p3.replace("/*BUILDVER*/", time.strftime("%Y%m%d%H%M")).replace("/*APPVER*/", open(os.path.join(root, "version.txt")).read().strip()).replace("/*ICONMAP*/", rd("iconmap.txt").strip())
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(rd("p1.html") + rd("p2.js") + p3)
