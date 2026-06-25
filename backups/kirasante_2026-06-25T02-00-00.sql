--
-- PostgreSQL database dump
--

\restrict FMezGlcBhALoqZTIQPdb0WMGcM33MYXpzGu2he7Q0WfBdE80nnDDgMsspiILLKU

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: langue_locale; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.langue_locale AS ENUM (
    'moore',
    'dioula',
    'fulfulde',
    'fr'
);


ALTER TYPE public.langue_locale OWNER TO kirasante_user;

--
-- Name: role_agent; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.role_agent AS ENUM (
    'patient',
    'agent',
    'admin'
);


ALTER TYPE public.role_agent OWNER TO kirasante_user;

--
-- Name: statut_alerte; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.statut_alerte AS ENUM (
    'active',
    'resolue',
    'en_cours'
);


ALTER TYPE public.statut_alerte OWNER TO kirasante_user;

--
-- Name: statut_sms; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.statut_sms AS ENUM (
    'en_attente',
    'envoye',
    'echec'
);


ALTER TYPE public.statut_sms OWNER TO kirasante_user;

--
-- Name: sync_operation; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.sync_operation AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public.sync_operation OWNER TO kirasante_user;

--
-- Name: sync_status; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.sync_status AS ENUM (
    'synced',
    'pending',
    'conflict'
);


ALTER TYPE public.sync_status OWNER TO kirasante_user;

--
-- Name: type_rappel; Type: TYPE; Schema: public; Owner: kirasante_user
--

CREATE TYPE public.type_rappel AS ENUM (
    'vaccin',
    'rdv',
    'medication',
    'alerte'
);


ALTER TYPE public.type_rappel OWNER TO kirasante_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.agents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(150),
    telephone character varying(20) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    role public.role_agent DEFAULT 'agent'::public.role_agent,
    district_id uuid,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fcm_token character varying(255),
    deleted_at timestamp without time zone
);


ALTER TABLE public.agents OWNER TO kirasante_user;

--
-- Name: alertes; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.alertes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type_alerte character varying(100) NOT NULL,
    district_id uuid,
    latitude numeric(10,8),
    longitude numeric(11,8),
    nombre_cas integer DEFAULT 0 NOT NULL,
    date_detection timestamp without time zone DEFAULT now(),
    statut public.statut_alerte DEFAULT 'active'::public.statut_alerte,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.alertes OWNER TO kirasante_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agent_id uuid,
    action character varying(100) NOT NULL,
    table_cible character varying(50),
    record_id uuid,
    details jsonb,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO kirasante_user;

--
-- Name: consultations; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.consultations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    agent_id uuid,
    date_consultation timestamp without time zone DEFAULT now() NOT NULL,
    motif text NOT NULL,
    diagnostic text,
    traitement text,
    symptomes jsonb DEFAULT '[]'::jsonb,
    latitude numeric(10,8),
    longitude numeric(11,8),
    structure character varying(150),
    sync_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.consultations OWNER TO kirasante_user;

--
-- Name: districts; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.districts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    region character varying(100) NOT NULL,
    population integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.districts OWNER TO kirasante_user;

--
-- Name: dossier_versions; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.dossier_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    agent_id uuid,
    action character varying(50) NOT NULL,
    table_cible character varying(50) NOT NULL,
    ancien_etat jsonb,
    nouvel_etat jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dossier_versions OWNER TO kirasante_user;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.patients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    qr_code character varying(64) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    date_naissance date NOT NULL,
    sexe character(1),
    groupe_sanguin character varying(5),
    allergies text,
    telephone character varying(20),
    langue public.langue_locale DEFAULT 'fr'::public.langue_locale,
    district_id uuid,
    agent_id uuid,
    sync_status public.sync_status DEFAULT 'pending'::public.sync_status,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    CONSTRAINT patients_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);


ALTER TABLE public.patients OWNER TO kirasante_user;

--
-- Name: rappels_sms; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.rappels_sms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid,
    telephone character varying(20) NOT NULL,
    message text NOT NULL,
    date_envoi_prevu timestamp without time zone NOT NULL,
    statut public.statut_sms DEFAULT 'en_attente'::public.statut_sms,
    type_rappel public.type_rappel NOT NULL,
    tentatives integer DEFAULT 0,
    envoye_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rappels_sms OWNER TO kirasante_user;

--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.sync_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    table_cible character varying(50) NOT NULL,
    record_id uuid NOT NULL,
    operation public.sync_operation NOT NULL,
    payload jsonb NOT NULL,
    agent_id uuid,
    synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sync_queue OWNER TO kirasante_user;

--
-- Name: tentatives_connexion; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.tentatives_connexion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ip_address character varying(45) NOT NULL,
    telephone character varying(20),
    succes boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tentatives_connexion OWNER TO kirasante_user;

--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.token_blacklist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token_hash character varying(64) NOT NULL,
    agent_id uuid,
    expire_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_blacklist OWNER TO kirasante_user;

--
-- Name: vaccinations; Type: TABLE; Schema: public; Owner: kirasante_user
--

CREATE TABLE public.vaccinations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    agent_id uuid,
    vaccin_nom character varying(100) NOT NULL,
    date_admin date NOT NULL,
    lot character varying(50),
    prochain_rappel date,
    structure character varying(150),
    sync_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.vaccinations OWNER TO kirasante_user;

--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.agents (id, nom, prenom, email, telephone, mot_de_passe, role, district_id, actif, created_at, updated_at, fcm_token, deleted_at) FROM stdin;
ef334d95-7c59-43ca-b3e9-f59cfe52240b	Sanon	Mohamed	mohamed@kirasante.bf	+22670000000	$2b$10$tMUfK34qEwe7wdn63lf50eqvsFkylPSZHTRFDD/ENlTukYZfKa2XW	admin	\N	t	2026-06-22 12:48:48.610322	2026-06-22 12:48:48.610322	\N	\N
077987e9-fc96-45c6-80d3-59064442292b	Traoré	Aminata	\N	+22670111222	$2b$12$eIcLq/6xHX7Xr7h5KRsSu.ZxfGOQBRxGsy8oBxHuG5WZQtjphEhCG	agent	\N	t	2026-06-22 18:08:48.171858	2026-06-22 18:08:48.171858	\N	\N
e0d48e69-2569-42b0-bd41-4c679578787f	SANON	Mohamed	\N	+22667059399	$2b$12$tznsnrHopOZXB2NE0hfq/.wZXItpTkaSFYCl6xiNo9YfIm4dMgjY2	admin	aaf650c0-bea3-42c7-9954-401cfa81b508	t	2026-05-31 08:30:41.638522	2026-06-03 10:50:00.509727	test_fcm_token_sandbox_123	\N
\.


--
-- Data for Name: alertes; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.alertes (id, type_alerte, district_id, latitude, longitude, nombre_cas, date_detection, statut, description, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.audit_logs (id, agent_id, action, table_cible, record_id, details, ip_address, created_at) FROM stdin;
3039b0dc-ea5f-4570-9b08-a1afe0158260	e0d48e69-2569-42b0-bd41-4c679578787f	DELETE_PATIENT	patients	\N	{"url": "/a15e01af-9e39-4005-b9f5-a4a44a0a37d0", "method": "DELETE", "params": {"id": "a15e01af-9e39-4005-b9f5-a4a44a0a37d0"}}	::1	2026-06-19 08:33:54.457418
2ee2b582-4a64-4108-8fe5-1b8e9664de44	e0d48e69-2569-42b0-bd41-4c679578787f	LOGOUT	\N	\N	{"url": "/logout", "method": "POST", "params": {}}	::1	2026-06-23 13:08:25.776341
beb6ca71-423e-44a6-b3e7-506359c1a38e	e0d48e69-2569-42b0-bd41-4c679578787f	LOGOUT	\N	\N	{"url": "/logout", "method": "POST", "params": {}}	::1	2026-06-24 00:40:47.685504
\.


--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.consultations (id, patient_id, agent_id, date_consultation, motif, diagnostic, traitement, symptomes, latitude, longitude, structure, sync_status, created_at, deleted_at) FROM stdin;
81991171-32aa-4319-acb8-f69dee5d0990	a15e01af-9e39-4005-b9f5-a4a44a0a37d0	e0d48e69-2569-42b0-bd41-4c679578787f	2026-06-19 08:33:54.193601	Fievre et toux	\N	\N	[]	\N	\N	\N	pending	2026-06-19 08:33:54.193601	\N
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.districts (id, nom, region, population, created_at) FROM stdin;
aaf650c0-bea3-42c7-9954-401cfa81b508	District de Ouagadougou	Centre	2500000	2026-06-02 23:56:58.076189
\.


--
-- Data for Name: dossier_versions; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.dossier_versions (id, patient_id, agent_id, action, table_cible, ancien_etat, nouvel_etat, created_at) FROM stdin;
0ceb62e1-6d95-4e1a-9e81-a327b0b6c9fd	a15e01af-9e39-4005-b9f5-a4a44a0a37d0	e0d48e69-2569-42b0-bd41-4c679578787f	CREATION	consultations	\N	{"id": "81991171-32aa-4319-acb8-f69dee5d0990", "motif": "Fievre et toux", "agent_id": "e0d48e69-2569-42b0-bd41-4c679578787f", "latitude": null, "longitude": null, "structure": null, "symptomes": [], "created_at": "2026-06-19T08:33:54.193Z", "deleted_at": null, "diagnostic": null, "patient_id": "a15e01af-9e39-4005-b9f5-a4a44a0a37d0", "traitement": null, "sync_status": "pending", "date_consultation": "2026-06-19T08:33:54.193Z"}	2026-06-19 08:33:54.320089
cd1da297-d123-4664-9c79-94f65b7b4dab	a15e01af-9e39-4005-b9f5-a4a44a0a37d0	e0d48e69-2569-42b0-bd41-4c679578787f	SUPPRESSION	patients	{"id": "a15e01af-9e39-4005-b9f5-a4a44a0a37d0", "nom": "OUEDRAOGO", "sexe": "F", "langue": "moore", "prenom": "Aminata", "qr_code": "KIRA-D787C164A603", "agent_id": "e0d48e69-2569-42b0-bd41-4c679578787f", "allergies": null, "telephone": "+22670111222", "created_at": "2026-06-03T21:10:55.094Z", "deleted_at": null, "updated_at": "2026-06-03T21:10:55.094Z", "district_id": "aaf650c0-bea3-42c7-9954-401cfa81b508", "sync_status": "pending", "date_naissance": "1990-05-15T00:00:00.000Z", "groupe_sanguin": "O+"}	\N	2026-06-19 08:33:54.437803
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.patients (id, qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin, allergies, telephone, langue, district_id, agent_id, sync_status, created_at, updated_at, deleted_at) FROM stdin;
a15e01af-9e39-4005-b9f5-a4a44a0a37d0	KIRA-D787C164A603	OUEDRAOGO	Aminata	1990-05-15	F	O+	\N	+22670111222	moore	aaf650c0-bea3-42c7-9954-401cfa81b508	e0d48e69-2569-42b0-bd41-4c679578787f	pending	2026-06-03 21:10:55.094706	2026-06-03 21:10:55.094706	2026-06-19 08:33:54.419824
\.


--
-- Data for Name: rappels_sms; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.rappels_sms (id, patient_id, telephone, message, date_envoi_prevu, statut, type_rappel, tentatives, envoye_at, created_at) FROM stdin;
4fe6cb5b-6e0f-4d05-886c-ccf516aad8f1	\N	+22667059399	Rappel vaccin antipolio demain	2026-06-04 08:00:00	envoye	vaccin	0	2026-06-04 08:00:00.414137	2026-06-03 21:09:18.306401
1c12ed9b-0465-4ec7-a753-8375a6dae4c2	a15e01af-9e39-4005-b9f5-a4a44a0a37d0	+22670111222	Rappel vaccin antipolio demain 8h au CSPS	2026-06-04 08:00:00	envoye	vaccin	0	2026-06-04 08:00:00.427538	2026-06-03 21:12:25.896561
\.


--
-- Data for Name: sync_queue; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.sync_queue (id, table_cible, record_id, operation, payload, agent_id, synced_at, created_at) FROM stdin;
\.


--
-- Data for Name: tentatives_connexion; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.tentatives_connexion (id, ip_address, telephone, succes, created_at) FROM stdin;
5c0ed2c8-31cf-48b5-af4b-1aa93a66dcea	::1	+22667059399	t	2026-06-24 20:07:20.302733
2346ce94-6f5e-4698-a5e4-a32806e772ce	::1	+22667059399	t	2026-06-24 20:11:08.834661
\.


--
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.token_blacklist (id, token_hash, agent_id, expire_at, created_at) FROM stdin;
3ae339d7-cb8c-41f1-a935-f4a0292488cc	e4ca78acab3389260e554e2981c82c91afd87d89c00f25a9f27b23442db7652a	e0d48e69-2569-42b0-bd41-4c679578787f	2026-06-11 22:04:28	2026-06-04 22:04:28.672513
366ca413-8a14-48fe-a91c-5398f340fdd6	c852d093fa5acd55c855e833547c98b1003bb3428b2e42e10757811fa41e95c0	e0d48e69-2569-42b0-bd41-4c679578787f	2026-06-30 12:37:23	2026-06-23 13:08:25.713396
97580ae5-0836-444e-a198-b96437e21057	0540392ed9b73d0ac2b2f39f83e427739f4b2764f85728d38aa5df9c291d3565	e0d48e69-2569-42b0-bd41-4c679578787f	2026-07-01 00:34:15	2026-06-24 00:40:47.627241
\.


--
-- Data for Name: vaccinations; Type: TABLE DATA; Schema: public; Owner: kirasante_user
--

COPY public.vaccinations (id, patient_id, agent_id, vaccin_nom, date_admin, lot, prochain_rappel, structure, sync_status, created_at, deleted_at) FROM stdin;
\.


--
-- Name: agents agents_email_key; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_email_key UNIQUE (email);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents agents_telephone_key; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_telephone_key UNIQUE (telephone);


--
-- Name: alertes alertes_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.alertes
    ADD CONSTRAINT alertes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: dossier_versions dossier_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.dossier_versions
    ADD CONSTRAINT dossier_versions_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: patients patients_qr_code_key; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_qr_code_key UNIQUE (qr_code);


--
-- Name: rappels_sms rappels_sms_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.rappels_sms
    ADD CONSTRAINT rappels_sms_pkey PRIMARY KEY (id);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: tentatives_connexion tentatives_connexion_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.tentatives_connexion
    ADD CONSTRAINT tentatives_connexion_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash);


--
-- Name: vaccinations vaccinations_pkey; Type: CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_pkey PRIMARY KEY (id);


--
-- Name: idx_agents_email; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_agents_email ON public.agents USING btree (email);


--
-- Name: idx_agents_telephone; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_agents_telephone ON public.agents USING btree (telephone);


--
-- Name: idx_alertes_district; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_alertes_district ON public.alertes USING btree (district_id);


--
-- Name: idx_alertes_statut; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_alertes_statut ON public.alertes USING btree (statut);


--
-- Name: idx_audit_agent; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_audit_agent ON public.audit_logs USING btree (agent_id);


--
-- Name: idx_blacklist_expire; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_blacklist_expire ON public.token_blacklist USING btree (expire_at);


--
-- Name: idx_blacklist_hash; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_blacklist_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_consultations_fts; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_consultations_fts ON public.consultations USING gin (to_tsvector('french'::regconfig, ((((COALESCE(motif, ''::text) || ' '::text) || COALESCE(diagnostic, ''::text)) || ' '::text) || COALESCE(traitement, ''::text))));


--
-- Name: idx_dossier_patient; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_dossier_patient ON public.dossier_versions USING btree (patient_id, created_at DESC);


--
-- Name: idx_patients_district; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_patients_district ON public.patients USING btree (district_id);


--
-- Name: idx_patients_fts; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_patients_fts ON public.patients USING gin (to_tsvector('french'::regconfig, (((COALESCE(nom, ''::character varying))::text || ' '::text) || (COALESCE(prenom, ''::character varying))::text)));


--
-- Name: idx_patients_qr; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_patients_qr ON public.patients USING btree (qr_code);


--
-- Name: idx_rappels_date; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_rappels_date ON public.rappels_sms USING btree (date_envoi_prevu);


--
-- Name: idx_rappels_statut; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_rappels_statut ON public.rappels_sms USING btree (statut);


--
-- Name: idx_sync_agent; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_sync_agent ON public.sync_queue USING btree (agent_id);


--
-- Name: idx_sync_synced; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_sync_synced ON public.sync_queue USING btree (synced_at);


--
-- Name: idx_tentatives_ip; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_tentatives_ip ON public.tentatives_connexion USING btree (ip_address, created_at);


--
-- Name: idx_tentatives_tel; Type: INDEX; Schema: public; Owner: kirasante_user
--

CREATE INDEX idx_tentatives_tel ON public.tentatives_connexion USING btree (telephone, created_at);


--
-- Name: agents agents_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: alertes alertes_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.alertes
    ADD CONSTRAINT alertes_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: audit_logs audit_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: consultations consultations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: consultations consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: dossier_versions dossier_versions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.dossier_versions
    ADD CONSTRAINT dossier_versions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: dossier_versions dossier_versions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.dossier_versions
    ADD CONSTRAINT dossier_versions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: patients patients_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: rappels_sms rappels_sms_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.rappels_sms
    ADD CONSTRAINT rappels_sms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: sync_queue sync_queue_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: token_blacklist token_blacklist_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: vaccinations vaccinations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: vaccinations vaccinations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kirasante_user
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FMezGlcBhALoqZTIQPdb0WMGcM33MYXpzGu2he7Q0WfBdE80nnDDgMsspiILLKU

