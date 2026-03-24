--
-- PostgreSQL database dump
--

\restrict NdU4cIzUEK22nQsM90wGlSTXBVMprUFlOVu9dYdYbLfSB9WquYT5IFZlIwZ70p8

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    persona_id integer NOT NULL,
    peloton_id integer NOT NULL,
    fecha text NOT NULL,
    estado text DEFAULT 'ausente'::text NOT NULL,
    motivo text,
    usuario_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion (
    clave text NOT NULL,
    valor text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pelotones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pelotones (
    id integer NOT NULL,
    nombre text NOT NULL,
    proceso_id integer NOT NULL,
    pnf_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pelotones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pelotones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pelotones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pelotones_id_seq OWNED BY public.pelotones.id;


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id integer NOT NULL,
    nombres text NOT NULL,
    apellidos text NOT NULL,
    ci text NOT NULL,
    sexo text NOT NULL,
    peloton_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: personas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personas_id_seq OWNED BY public.personas.id;


--
-- Name: planes_busqueda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes_busqueda (
    id integer NOT NULL,
    persona_id integer NOT NULL,
    telefono1 text,
    telefono2 text,
    telefono3 text,
    direccion text,
    lugar_origen text
);


--
-- Name: planes_busqueda_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_busqueda_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_busqueda_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_busqueda_id_seq OWNED BY public.planes_busqueda.id;


--
-- Name: pnfs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnfs (
    id integer NOT NULL,
    nombre text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pnfs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pnfs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pnfs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pnfs_id_seq OWNED BY public.pnfs.id;


--
-- Name: procesos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procesos (
    id integer NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_archivado timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: procesos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procesos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procesos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procesos_id_seq OWNED BY public.procesos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    email text NOT NULL,
    nombre text NOT NULL,
    password_hash text NOT NULL,
    rol text DEFAULT 'estandar'::text NOT NULL,
    peloton_id integer,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_invisible boolean DEFAULT false NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: pelotones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelotones ALTER COLUMN id SET DEFAULT nextval('public.pelotones_id_seq'::regclass);


--
-- Name: personas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas ALTER COLUMN id SET DEFAULT nextval('public.personas_id_seq'::regclass);


--
-- Name: planes_busqueda id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_busqueda ALTER COLUMN id SET DEFAULT nextval('public.planes_busqueda_id_seq'::regclass);


--
-- Name: pnfs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnfs ALTER COLUMN id SET DEFAULT nextval('public.pnfs_id_seq'::regclass);


--
-- Name: procesos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos ALTER COLUMN id SET DEFAULT nextval('public.procesos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asistencias (id, persona_id, peloton_id, fecha, estado, motivo, usuario_id, created_at, updated_at) FROM stdin;
5	5	1	2026-03-23	ausente	\N	1	2026-03-23 19:10:17.458849	2026-03-23 19:46:08.732
15	2	1	2026-03-23	reposo	\N	2	2026-03-23 23:26:56.490868	2026-03-23 23:54:30.828
16	3	1	2026-03-23	presente	\N	2	2026-03-23 23:26:56.574897	2026-03-23 23:54:30.831
4	4	1	2026-03-23	pasantia	\N	2	2026-03-23 19:10:17.455398	2026-03-23 23:54:30.834
6	6	1	2026-03-23	permiso	\N	2	2026-03-23 19:10:17.461844	2026-03-23 23:54:30.836
7	7	1	2026-03-23	ausente	\N	2	2026-03-23 19:10:17.465072	2026-03-23 23:54:30.839
11	2	1	2026-03-12	ausente	\N	3	2026-03-23 20:54:59.232239	2026-03-23 20:55:01.062
8	8	1	2026-03-23	presente	\N	2	2026-03-23 19:10:17.468184	2026-03-23 23:54:30.841
12	3	1	2026-03-04	ausente	\N	3	2026-03-23 20:55:19.47106	2026-03-23 20:55:24.283
13	4	1	2026-03-05	ausente	\N	3	2026-03-23 20:56:07.268838	2026-03-23 20:56:07.268838
9	9	1	2026-03-23	comision	\N	2	2026-03-23 19:10:17.471597	2026-03-23 23:54:30.852
14	3	1	2026-03-10	comision	\N	3	2026-03-23 20:57:00.008312	2026-03-23 20:57:01.855
10	10	1	2026-03-23	presente	\N	2	2026-03-23 19:10:17.474575	2026-03-23 23:54:30.855
17	2	1	2026-03-24	reposo	\N	2	2026-03-24 00:02:18.522403	2026-03-24 00:02:18.522403
18	3	1	2026-03-24	presente	\N	2	2026-03-24 00:02:18.54994	2026-03-24 00:02:18.54994
19	4	1	2026-03-24	pasantia	\N	2	2026-03-24 00:02:18.560339	2026-03-24 00:02:18.560339
20	6	1	2026-03-24	permiso	\N	2	2026-03-24 00:02:18.5638	2026-03-24 00:02:18.5638
21	7	1	2026-03-24	ausente	\N	2	2026-03-24 00:02:18.56648	2026-03-24 00:02:18.56648
22	8	1	2026-03-24	presente	\N	2	2026-03-24 00:02:18.569328	2026-03-24 00:02:18.569328
23	9	1	2026-03-24	comision	\N	2	2026-03-24 00:02:18.57238	2026-03-24 00:02:18.57238
24	10	1	2026-03-24	presente	\N	2	2026-03-24 00:02:18.5757	2026-03-24 00:02:18.5757
\.


--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracion (clave, valor, updated_at) FROM stdin;
bloqueo_activo	true	2026-03-24 00:35:27.832
\.


--
-- Data for Name: pelotones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pelotones (id, nombre, proceso_id, pnf_id, created_at) FROM stdin;
2	Pelotón 1	1	2	2026-03-23 23:26:35.479572
1	IP UNICO	1	3	2026-03-23 18:32:51.372916
\.


--
-- Data for Name: personas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personas (id, nombres, apellidos, ci, sexo, peloton_id, created_at, updated_at) FROM stdin;
3	José Miguel	Martínez Flores	V-34567890	M	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
4	Ana Lucía	Torres Herrera	V-45678901	F	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
6	Carmen Rosa	Vargas Jiménez	V-67890123	F	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
7	Pedro Antonio	Sánchez Ruiz	V-78901234	M	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
8	Valentina	Mendoza Castro	V-89012345	F	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
9	Roberto Carlos	Hernández Gil	V-90123456	M	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
10	Daniela	Flores Ortega	V-01234567	F	1	2026-03-23 18:33:20.548378	2026-03-23 18:33:20.548378
\.


--
-- Data for Name: planes_busqueda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planes_busqueda (id, persona_id, telefono1, telefono2, telefono3, direccion, lugar_origen) FROM stdin;
1	6	\N	\N	\N	\N	\N
\.


--
-- Data for Name: pnfs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pnfs (id, nombre, created_at) FROM stdin;
2	Criminalistica	2026-03-23 19:29:22.169463
3	Investigacion Penal	2026-03-23 19:29:22.301859
4	Bomberil	2026-03-23 19:29:22.346215
5	Policial Mixto	2026-03-23 19:29:22.391768
6	Custodio	2026-03-23 19:29:22.435034
\.


--
-- Data for Name: procesos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procesos (id, nombre, activo, fecha_archivado, created_at) FROM stdin;
1	Proceso 2025	t	\N	2026-03-23 18:32:42.837345
2	Proceso II-2025	t	\N	2026-03-23 23:24:38.853839
3	Proceso 1-2026	t	\N	2026-03-23 23:24:55.597535
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, email, nombre, password_hash, rol, peloton_id, activo, created_at, is_invisible) FROM stdin;
3	root@invisible.admin	Sistema Invisible	546f437d834d1fe299680e684252ec9e88a61475671e8285e15e51c3b8f3244f	superusuario	\N	t	2026-03-23 20:22:03.465496	t
1	admin@policia.gob.ve	Administrador	eeea7af566eaa1ec19871a5074808e5bd4df3e28644fab20e81ebfc69ca6bb8a	superusuario	\N	t	2026-03-23 18:32:55.684303	f
2	colector@policia.gob.ve	Colector Demo	0b0b2c6968939339c4606716c3c102417b59bfaeba85109435254c8a3a9b69a7	estandar	1	t	2026-03-23 18:32:59.762487	f
\.


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asistencias_id_seq', 24, true);


--
-- Name: pelotones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pelotones_id_seq', 2, true);


--
-- Name: personas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personas_id_seq', 10, true);


--
-- Name: planes_busqueda_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planes_busqueda_id_seq', 3, true);


--
-- Name: pnfs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pnfs_id_seq', 6, true);


--
-- Name: procesos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.procesos_id_seq', 3, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 3, true);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (clave);


--
-- Name: pelotones pelotones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelotones
    ADD CONSTRAINT pelotones_pkey PRIMARY KEY (id);


--
-- Name: personas personas_ci_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_ci_unique UNIQUE (ci);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: planes_busqueda planes_busqueda_persona_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_busqueda
    ADD CONSTRAINT planes_busqueda_persona_id_unique UNIQUE (persona_id);


--
-- Name: planes_busqueda planes_busqueda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_busqueda
    ADD CONSTRAINT planes_busqueda_pkey PRIMARY KEY (id);


--
-- Name: pnfs pnfs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnfs
    ADD CONSTRAINT pnfs_pkey PRIMARY KEY (id);


--
-- Name: procesos procesos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos
    ADD CONSTRAINT procesos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_unique UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict NdU4cIzUEK22nQsM90wGlSTXBVMprUFlOVu9dYdYbLfSB9WquYT5IFZlIwZ70p8

