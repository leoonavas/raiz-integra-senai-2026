import sys, importlib
from mini import salvar
for m in sys.argv[1:]:
    d = importlib.import_module(m).build(); print(salvar(d, '../'))
