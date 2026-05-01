-- Revertir rename del CECO PARTIDO-FEFI--D-Fecha 12-A.Ve.F.A.-
-- En el alineamiento previo (cc_align), renombramos este CECO a la versión
-- con formato Notion-link `[12-A.Ve](http://12-A.Ve).F.A.-` porque venía así
-- en el listado de CECOs. Pero la columna `Centro de Costo` del CSV de
-- movimientos referencia la versión "limpia" `12-A.Ve.F.A.-`.
-- Volvemos al nombre limpio para que el parser haga match.

UPDATE public.cost_centers
SET name = 'PARTIDO-FEFI--D-Fecha 12-A.Ve.F.A.-'
WHERE id = '1373dd84-7ebe-4ca5-a899-76a172a8880e';
