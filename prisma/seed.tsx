import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Campo = { key: string; label: string; type: 'corto' | 'largo' | 'numero' | 'imagen' | 'lista' };
type Repeater = { kind: string; itemLabel: string; repeatable: boolean; fields: Campo[]; audioCtx: string };

const interacciones: { nombre: string; itemLabel: string; repeatable: boolean; campos: Repeater[] }[] = [
  {
    nombre: 'Tarjetas', itemLabel: 'Tarjeta', repeatable: true,
    campos: [{ kind: 'tarjetas', itemLabel: 'Tarjeta', repeatable: true,
      fields: [{ key: 'frente', label: 'Frente (texto)', type: 'corto' }, { key: 'reverso', label: 'Reverso (texto)', type: 'largo' }],
      audioCtx: 'se reproduce al girar la tarjeta' }],
  },
  {
    nombre: 'Pirámide de jerarquía', itemLabel: 'Nivel', repeatable: true,
    campos: [{ kind: 'niveles', itemLabel: 'Nivel', repeatable: true,
      fields: [{ key: 'nombre', label: 'Nombre del nivel', type: 'corto' }, { key: 'descripcion', label: 'Descripción', type: 'largo' }],
      audioCtx: 'se reproduce al hacer clic en este nivel' }],
  },
  {
    nombre: 'Switch comparativo', itemLabel: 'Comparación', repeatable: false,
    campos: [{ kind: 'switch', itemLabel: 'Comparación', repeatable: false,
      fields: [
        { key: 'opcionATitulo', label: 'Título opción A', type: 'corto' }, { key: 'opcionATexto', label: 'Texto opción A', type: 'largo' },
        { key: 'opcionBTitulo', label: 'Título opción B', type: 'corto' }, { key: 'opcionBTexto', label: 'Texto opción B', type: 'largo' },
      ],
      audioCtx: 'se reproduce al activar el switch' }],
  },
  {
    nombre: 'Imagen con detalle', itemLabel: 'Punto de interés', repeatable: true,
    campos: [{ kind: 'puntos', itemLabel: 'Punto de interés', repeatable: true,
      fields: [{ key: 'etiqueta', label: 'Etiqueta del punto', type: 'corto' }, { key: 'detalle', label: 'Detalle', type: 'largo' }],
      audioCtx: 'se reproduce al hacer clic en este punto' }],
  },
  {
    nombre: 'Video', itemLabel: 'Video', repeatable: false,
    campos: [{ kind: 'video', itemLabel: 'Video', repeatable: false,
      fields: [{ key: 'descripcion', label: 'Descripción / guion del video', type: 'largo' }, { key: 'transcripcion', label: 'Transcripción (opcional)', type: 'largo' }],
      audioCtx: 'el audio suele venir incorporado en el video' }],
  },
  {
    nombre: 'Mapa conceptual interactivo', itemLabel: 'Nodo', repeatable: true,
    campos: [{ kind: 'nodos', itemLabel: 'Nodo', repeatable: true,
      fields: [{ key: 'concepto', label: 'Concepto', type: 'corto' }, { key: 'explicacion', label: 'Explicación', type: 'largo' }, { key: 'conectaCon', label: 'Conecta con (uno por línea)', type: 'lista' }],
      audioCtx: 'se reproduce al hacer clic en este nodo' }],
  },
  {
    nombre: 'Línea de tiempo interactiva', itemLabel: 'Hito', repeatable: true,
    campos: [{ kind: 'hitos', itemLabel: 'Hito', repeatable: true,
      fields: [{ key: 'etiqueta', label: 'Fecha / etiqueta', type: 'corto' }, { key: 'evento', label: 'Evento', type: 'largo' }],
      audioCtx: 'se reproduce al abrir este hito' }],
  },
  {
    nombre: 'Acordeón', itemLabel: 'Sección', repeatable: true,
    campos: [{ kind: 'secciones', itemLabel: 'Sección', repeatable: true,
      fields: [{ key: 'titulo', label: 'Título de la sección', type: 'corto' }, { key: 'contenido', label: 'Contenido', type: 'largo' }],
      audioCtx: 'se reproduce al expandir esta sección' }],
  },
  {
    nombre: 'Pestañas', itemLabel: 'Pestaña', repeatable: true,
    campos: [{ kind: 'pestanas', itemLabel: 'Pestaña', repeatable: true,
      fields: [{ key: 'titulo', label: 'Título de la pestaña', type: 'corto' }, { key: 'contenido', label: 'Contenido', type: 'largo' }],
      audioCtx: 'se reproduce al abrir esta pestaña' }],
  },
  {
    nombre: 'Clasificación (drag & drop)', itemLabel: 'Elemento', repeatable: true,
    campos: [
      { kind: 'elementos', itemLabel: 'Elemento', repeatable: true,
        fields: [{ key: 'texto', label: 'Elemento', type: 'corto' }, { key: 'categoria', label: 'Categoría correcta', type: 'corto' }],
        audioCtx: 'se reproduce al soltar el elemento en su categoría' },
      { kind: 'categorias', itemLabel: 'Categoría / contenedor', repeatable: true,
        fields: [{ key: 'nombre', label: 'Nombre de la categoría', type: 'corto' }],
        audioCtx: 'se reproduce al soltar un elemento aquí' },
    ],
  },
  {
    nombre: 'Escenario ramificado', itemLabel: 'Nodo de decisión', repeatable: true,
    campos: [{ kind: 'nodos_decision', itemLabel: 'Nodo de decisión', repeatable: true,
      fields: [
        { key: 'situacion', label: 'Situación planteada', type: 'largo' },
        { key: 'opcionA', label: 'Opción A', type: 'corto' }, { key: 'consecuenciaA', label: 'Consecuencia de A', type: 'largo' },
        { key: 'opcionB', label: 'Opción B', type: 'corto' }, { key: 'consecuenciaB', label: 'Consecuencia de B', type: 'largo' },
      ],
      audioCtx: 'se reproduce al llegar a este nodo de decisión' }],
  },
  {
    nombre: 'Comparador antes/después', itemLabel: 'Comparación', repeatable: true,
    campos: [{ kind: 'comparaciones', itemLabel: 'Comparación', repeatable: true,
      fields: [
        { key: 'etiqueta', label: 'Etiqueta', type: 'corto' },
        { key: 'antesDesc', label: 'Descripción "antes"', type: 'largo' }, { key: 'antesImagen', label: 'Imagen "antes"', type: 'imagen' },
        { key: 'despuesDesc', label: 'Descripción "después"', type: 'largo' }, { key: 'despuesImagen', label: 'Imagen "después"', type: 'imagen' },
      ],
      audioCtx: 'se reproduce al deslizar el comparador' }],
  },
  {
    nombre: 'Glosario interactivo', itemLabel: 'Término', repeatable: true,
    campos: [{ kind: 'terminos', itemLabel: 'Término', repeatable: true,
      fields: [{ key: 'termino', label: 'Término', type: 'corto' }, { key: 'definicion', label: 'Definición', type: 'largo' }],
      audioCtx: 'se reproduce al abrir este término' }],
  },
  {
    nombre: 'Proceso paso a paso', itemLabel: 'Paso', repeatable: true,
    campos: [{ kind: 'pasos', itemLabel: 'Paso', repeatable: true,
      fields: [{ key: 'titulo', label: 'Título del paso', type: 'corto' }, { key: 'instruccion', label: 'Instrucción', type: 'largo' }],
      audioCtx: 'se reproduce al avanzar a este paso' }],
  },
  {
    nombre: 'Matriz comparativa', itemLabel: 'Fila', repeatable: true,
    campos: [
      { kind: 'columnas', itemLabel: 'Columna', repeatable: true,
        fields: [{ key: 'titulo', label: 'Título de la columna', type: 'corto' }], audioCtx: '' },
      { kind: 'filas', itemLabel: 'Fila', repeatable: true,
        fields: [{ key: 'criterio', label: 'Criterio', type: 'corto' }, { key: 'valores', label: 'Valores por columna (uno por línea, en orden)', type: 'lista' }],
        audioCtx: 'se reproduce al hacer clic en esta fila' },
    ],
  },
  {
    nombre: 'Simulador de pantalla (click-through)', itemLabel: 'Paso del simulador', repeatable: true,
    campos: [{ kind: 'pasos_simulador', itemLabel: 'Paso del simulador', repeatable: true,
      fields: [{ key: 'instruccion', label: 'Instrucción para el estudiante', type: 'largo' }, { key: 'zonaClic', label: 'Zona donde debe hacer clic', type: 'corto' }, { key: 'captura', label: 'Captura de pantalla requerida', type: 'imagen' }],
      audioCtx: 'se reproduce al llegar a este paso' }],
  },
  { nombre: 'Otro', itemLabel: '', repeatable: true, campos: [] },
];

const triggers = [
  'Clic en objeto', 'Hover', 'Arrastrar y soltar', 'Condición de variable',
  'Automático / inicio de línea de tiempo', 'Temporizador',
  'Envío de respuesta / evaluación', 'Cambio de estado de objeto', 'Otro',
];

async function main() {
  for (const i of interacciones) {
    await prisma.interaccionCatalogo.upsert({
      where: { nombre: i.nombre },
      update: {},
      create: {
        nombre: i.nombre,
        tipo: 'interaccion',
        itemLabel: i.itemLabel,
        repeatable: i.repeatable,
        campos: i.campos,
        audioCtx: '',
      },
    });
  }

  for (const t of triggers) {
    await prisma.interaccionCatalogo.upsert({
      where: { nombre: t },
      update: {},
      create: { nombre: t, tipo: 'trigger', itemLabel: '', repeatable: false, campos: [], audioCtx: '' },
    });
  }

  console.log(`Sembradas ${interacciones.length} interacciones y ${triggers.length} triggers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });