PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE pii_vault (
        id TEXT PRIMARY KEY,
        data_hash TEXT NOT NULL,
        encrypted_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gdpr_consent INTEGER DEFAULT 1
    );
CREATE TABLE beneficiaries (
        id TEXT PRIMARY KEY,
        name TEXT,
        nickname TEXT,
        account_number TEXT,
        bank_name TEXT,
        swift_code TEXT,
        country TEXT,
        currency TEXT,
        beneficiary_type TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO beneficiaries VALUES('1151c1ea-b532-4551-a6ca-906f12a9efd0','Mohamad k. Idriss','MohamadkIdriss','125233332556656958','SGBL','SGBLGLX','SA','USD','individual','','2026-04-29 07:02:46');
INSERT INTO beneficiaries VALUES('af433f37-6c32-4b03-b1e0-20ad292a785c','John Smith','J. Smith','GB29NWBK60161331926819','HSBC London','HBUKGB4B','GB','GBP','individual','UK corporate client','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('59d8358e-296b-4f97-a670-1e8ed9211915','Marie Dupont','Marie','FR7630006000011234567890189','BNP Paribas','BNPAFRPP','FR','EUR','individual','Paris-based partner','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('cf8c62e8-f1ea-46f6-97a5-277f43c3212f','Tanaka Hiroshi','Tanaka-san','JP1234567890123456','Mizuho Bank','MHCBJPJT','JP','JPY','individual','Tokyo office contact','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('489f4f8e-6920-4624-93d0-d259c4597c02','Ahmad Al-Mansoori','Ahmad','AE070331234567890123456','Abu Dhabi Islamic Bank','ADIBAEAA','AE','AED','individual','Dubai trade partner','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('6ebb9b46-9046-4036-965d-75a843ccb71c','Li Wei','Li','CN1234567890123456789','ICBC Shanghai','ICBKCNBJ','CN','CNY','individual','Shanghai supplier','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('674e428f-9d0a-4c8e-87fd-95bf6e897635','Priya Sharma','Priya','IN30234567890123456789','HDFC Bank','HDFCINBB','IN','INR','individual','Mumbai partner','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('e8df2f16-e929-438f-9274-22d7646d9a43','Carlos Vega','C. Vega','MX1234567890123456','BBVA Mexico','BCMRMXMM','MX','USD','individual','Mexico City distributor','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('6f51eca3-10d1-499e-9e47-c79696af43d4','Global Trade Corp','GTC','DE89370400440532013000','Deutsche Bank','DEUTDEDB','DE','EUR','corporate','Verified tier-1 corporate','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('5c915d40-0bcb-49dc-ae0f-207ed4145dbb','Acme International','Acme','US12345678901234567890','Citibank NA','CITIUS33','US','USD','corporate','Long-standing US counterparty','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('9d864ae6-3fc1-4681-94d9-5ae9c6be4c1d','Singapore Holdings','SG Holdings','SG29DBSB0000000123456','DBS Bank','DBSSSGSG','SG','SGD','corporate','APAC regional hub entity','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('afdc2f9d-5fe6-4417-bdda-b6eec9fedc85','Swiss Precision GmbH','Swiss Prec.','CH9300762011623852957','UBS AG Zurich','UBSWCHZH','CH','CHF','corporate','Swiss manufacturing partner','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('77a7d5e9-3355-46ec-8ac0-748c8a8ef377','Nordic Investments AB','Nordic Inv.','SE3550000000054910000003','Nordea Bank','NDEASESS','SE','EUR','corporate','Scandinavian investment fund','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('d33ed91e-e393-4b44-a92d-d532d4c26f06','Shell Company Alpha','SCA','KY1234567890123456','Cayman National Bank','CAYIKYKX','KY','USD','corporate','SUSPICIOUS — Watchlist entity','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('b1b3c73d-1855-4a4a-a910-abb6ae8bf610','Offshore Haven Corp','OHC','VG1234567890123456','BVI Capital Bank','BVICVGVG','VG','USD','corporate','SUSPICIOUS — Offshore high-risk jurisdiction','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('6be68d40-bd18-4094-92c2-b167aa3b9310','Dark Web Exchange','DWE','PA1234567890123456','Panama Trust Bank','PANAPAXX','PA','USD','corporate','SUSPICIOUS — Sanctions watchlist match','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('585bdea5-9a85-4de9-9334-27dea36c76e2','Phantom Bank Ltd','Phantom','SC1234567890123456','Seychelles Intl Bank','SEYCSCSC','SC','USD','corporate','SUSPICIOUS — Known shell entity','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('18317feb-ec4a-4626-9a03-d534c4426e62','Hawala Underground Services','Hawala','AE9912345678901234','Gulf Money Transfer','GMTFAEDU','AE','AED','corporate','SUSPICIOUS — Unlicensed money transfer network','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('9a493fc7-19d2-492b-a6fc-93d3820a43b6','Narco Laundry Inc','NLI','MX9987654321012345','Cartel Finance SA','CRTLMXXX','MX','USD','corporate','SUSPICIOUS — Known narcotics proceeds laundering','2026-04-30 06:35:48');
INSERT INTO beneficiaries VALUES('933465cc-8297-47dd-ac6d-052e6c25d9f1','Arms Dealer International','ADI','IR1234567890123456','Tehran Intl Bank','TEHRIRXX','IR','USD','corporate','SUSPICIOUS — Weapons trafficking, OFAC SDN list','2026-04-30 06:35:48');
CREATE TABLE virtual_cards (
        id TEXT PRIMARY KEY,
        username TEXT,
        label TEXT,
        card_network TEXT,
        card_number TEXT,
        expiry_month INTEGER,
        expiry_year INTEGER,
        cvv TEXT,
        spending_limit REAL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO virtual_cards VALUES('8e3880a1-b806-476c-a010-fb704d04c70b','mohamad','Test Card','Visa','4xxx xxxx xxxx 3745',12,2028,'954',5000.0,'active','2026-04-19 13:23:58');
INSERT INTO virtual_cards VALUES('09708681-d6af-4ae3-a5a7-008363a9154c','sara','Online Shopping','Visa','**** **** **** 6080',7,2029,'776',2000.0,'active','2026-04-28 20:45:21');
INSERT INTO virtual_cards VALUES('227932fe-6ca4-4601-9145-276866041581','sara','Trading Card','Visa','**** **** **** 2390',12,2029,'916',50000.0,'active','2026-04-28 21:12:42');
INSERT INTO virtual_cards VALUES('831d1ff8-9cf9-4f25-8513-fbdf285193e3','sara','International Card','Visa','**** **** **** 1344',12,2029,'521',50000.0,'active','2026-04-28 21:13:03');
CREATE TABLE kyc_verifications (
        id TEXT PRIMARY KEY,
        username TEXT,
        doc_type TEXT,
        doc_status TEXT DEFAULT 'not_started',
        verification_score INTEGER,
        verified_at TIMESTAMP
    );
CREATE TABLE settlements (
        id TEXT PRIMARY KEY,
        sender TEXT,
        receiver TEXT,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        risk_score REAL,
        status TEXT,
        tx_hash TEXT,
        iso20022_hash TEXT,
        beneficiary_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settlement_time_ms INTEGER,
        sender_username TEXT,
        receiver_username TEXT
    );
INSERT INTO settlements VALUES('11fe31cd-6896-4a8d-934a-f58d019d1033','Mohamad Idriss','0x1C53184587e4ba0aFb8d09629Ade29D8B5ed96C6',50000.0,'USD',6.0,'settled','N/A','02e07bc69b101421ac0348eba8fae9568b6af1a36fc167c8a57c9e0e03e7d943','Walid Elmahdy','2026-04-11 12:42:12',4,'mohamad','walid');
INSERT INTO settlements VALUES('c34bc1a4-7de5-46b5-8a48-a9b2df5118ea','Mohamad Idriss','0x75224118871db10A3128610aFC2BD0f4b14527Ac',50000.0,'USD',6.0,'settled','N/A','67502e760aa92a85a59df4743df508b366ff15b7bd2f0f7604393c87afba4bf4','Sriram Acharya Mudumbai','2026-04-11 12:50:41',4,'mohamad','sriram');
INSERT INTO settlements VALUES('bfc2966e-1d25-474e-b65f-a5a92b6e1f56','Mohamad Idriss','0x26048125Eba2b869751d06c8e5a7b231cEbfAB3F',50000.0,'USD',13.5,'settled','N/A','19e16252280c7208147312f6bf6a3a04f005a7229f0478e8d8c98d9572ea21f7','Global Trade Corp','2026-04-11 12:50:45',4,'mohamad','');
INSERT INTO settlements VALUES('03e1ccd4-e0b4-4102-90c8-539f0e83fce6','Mohamad Idriss','0x26048125Eba2b869751d06c8e5a7b231cEbfAB3F',50000.0,'USD',95.0,'settled','N/A',NULL,'Arms Dealer International','2026-04-11 12:50:49',NULL,'mohamad','');
INSERT INTO settlements VALUES('2f483b6b-c384-4813-9bdd-c5ab0b49f845','Mohamad Idriss','0x26048125Eba2b869751d06c8e5a7b231cEbfAB3F',50000.0,'USD',6.0,'settled','N/A','d70814ef4fdc6af25c326b91b6cf1e3afdf2f53b81b23aa91eb3e58daba89d15','Acme International','2026-04-11 12:50:54',4,'mohamad','');
INSERT INTO settlements VALUES('9dc830dc-df71-42ca-82d4-c4caa3d20c38','Mohamad Idriss','0x5f53F1Be310910955d0BBE3d0c25cd627f6b70A0',50000.0,'USD',32.00999999999999802,'settled','N/A','021b085a7a6929162fa995b75dac486e13adf8332ae76bb1cb036d005f7c0d38','Walid Elmahdy','2026-04-19 13:05:40',839,'mohamad','walid');
INSERT INTO settlements VALUES('f8712457-8caa-4e3a-a87f-9a7376ca03a3','Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236',50000.0,'USD',95.0,'settled','N/A',NULL,'Dark Web Exchange','2026-04-19 13:06:14',NULL,'mohamad','');
INSERT INTO settlements VALUES('a989d2e8-9cd1-47e0-ae09-faf247965866','Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236',150000.0,'USD',95.0,'settled','N/A',NULL,'Hawala Underground Services','2026-04-19 13:19:49',NULL,'mohamad','');
INSERT INTO settlements VALUES('2e39f166-adad-4105-bb58-de798c0cc57c','Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236',150000.0,'USD',95.0,'settled','N/A',NULL,'Arms Dealer International','2026-04-19 13:28:24',NULL,'mohamad','');
INSERT INTO settlements VALUES('78664f0c-5dcb-492f-925e-924a7858cfac','Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236',150000.0,'USD',95.0,'settled','N/A',NULL,'Phantom Bank Ltd','2026-04-19 13:32:22',NULL,'mohamad','');
INSERT INTO settlements VALUES('1ad20d8a-c95d-4912-9b94-8f35843b475d','Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236',50000.0,'USD',95.0,'settled','N/A',NULL,'Dark Web Exchange','2026-04-19 13:35:22',NULL,'mohamad','');
INSERT INTO settlements VALUES('b186bb28-f724-4f95-b68f-2725f45d9f24','Sara Mitchell','James Okafor',500.0,'USD',0.0,'settled',NULL,NULL,'James Okafor','2026-04-28T20:44:53.491365',NULL,'sara','james');
INSERT INTO settlements VALUES('68782f68-cce2-4c12-a50f-181a367510a9','Sara Mitchell','0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',100.0,'USD',15.16000000000000014,'settled','N/A','33e6605f0ea9093dc9b391781e9e1e8edb261b5300cbdb53c84df65d12a5c776','Mohamad Idriss','2026-04-28 21:06:13',726,'sara','mohamad');
INSERT INTO settlements VALUES('67fe364b-1756-4b8b-a28c-da42a11db791','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0xb6ba39ba76c69fa2cda0de811f4255b754c5ecd6853ace761b806598401c84a9',NULL,'Shell Company Alpha','2026-04-30 06:37:19',NULL,'sara','');
INSERT INTO settlements VALUES('07b9ed5c-e3e9-4a9e-b71b-e25877806263','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0x4f6076712bd919af336fa4a3afbc94baf982cf89d1e91ee9a75f0121834eb999',NULL,'Offshore Haven Corp','2026-04-30 06:40:18',NULL,'sara','');
INSERT INTO settlements VALUES('e1266713-bdd0-4cbc-a441-90476aaf95c4','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0xb62b58cc60422dac1eaf600400ef74ee6c990123aa270a9b00bdd374391c66e9',NULL,'Hawala Underground Services','2026-04-30 06:45:51',NULL,'sara','');
INSERT INTO settlements VALUES('6cf0dc36-1b5f-4392-bbf7-0581ce7b405f','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',25.64999999999999858,'settled','0x47063f4be190676a0ef406c7f7bdb2c292b595a7314d0b64569af93dd726a45d','b7665b83e3d2671e92cbbe8538e319d0df100ebeb98ace6906db410fef7b8d27','John Smith','2026-04-30 06:47:15',157,'sara','');
INSERT INTO settlements VALUES('72970472-a8b6-4007-b0a0-2b6485985fb6','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0x97bacaf95f9e6b3e3951ab451a709499efdec975b7554640dddd738b855263b2',NULL,'Shell Company Alpha','2026-04-30 06:47:29',NULL,'sara','');
INSERT INTO settlements VALUES('ac9e37e7-b23e-486c-8386-9d883b50a58a','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',16.19999999999999929,'settled','0x0a65e8e8fbfaf60d20e9203461c92cef8e5538a35bd29167e2e198a5d0c1bb41','a15ec96d933f370eda074fe4d942310a106e8074c622ad3162cec653215d145c','Mohamad k. Idriss','2026-04-30 06:51:11',162,'sara','');
INSERT INTO settlements VALUES('46b03514-4b0e-4f65-a13d-d2ad7afe60d0','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',95.0,'settled','0x1b1cf0dba2b6cda45b56630841c6c103027136934cfba16a811eb6df8bcc002e',NULL,'Shell Company Alpha','2026-04-30 06:51:25',NULL,'sara','');
INSERT INTO settlements VALUES('8ea10b86-bde0-4754-a235-4fdbefff6785','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',28.14999999999999858,'settled','0x5824439ed5325434191178f38da24f715c8f5b8f687d9444d9bd1999592b1f3e','607458e847f30ed18eccf5b076cf7c230819c9feb36340ccce0531cb29f59a55','John Smith','2026-04-30 06:53:26',572,'sara','');
INSERT INTO settlements VALUES('6be9d1ad-8efb-4247-8ff2-8960158291a5','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',95.0,'settled','0xacd0aa7ee1934890840d02277636cc3dbb5ee186389e8d83d3b5d430f39ddb30',NULL,'Dark Web Exchange','2026-04-30 06:53:38',NULL,'sara','');
INSERT INTO settlements VALUES('718834be-5be3-444e-802c-b3cd18823ba3','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',25.67999999999999972,'settled','0x8192eaf386098307222a182b752b48e6e409aaac5c5f17289e79ab877f9ecf43','a931171f4c84697264182d0863d3d5b7d1740b6dad04cdff702bd0ce146311bf','Ahmad Al-Mansoori','2026-04-30 06:59:32',666,'sara','');
INSERT INTO settlements VALUES('a17bd722-093d-4b70-8f53-eaaf187b14dd','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',95.0,'settled','0x7782d08e56a8ad133b28093ac79494bf8cf35a21dbe80eef196f985186c86def',NULL,'Narco Laundry Inc','2026-04-30 07:00:01',NULL,'sara','');
INSERT INTO settlements VALUES('e6be7fcf-621e-4de0-b455-2ff4f490ad69','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',50.0,'USD',95.0,'settled','0x802c0b50ccb9e901a7c0494e19057d92f97e49f5064675c7cdae207908d595fa',NULL,'Narco Laundry Inc','2026-04-30 07:01:23',NULL,'sara','');
INSERT INTO settlements VALUES('287370f3-b2b6-48d6-b684-94c440f3254a','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',130000.0,'USD',95.0,'settled','0xb4c4c9d6799a2c5d9a61bf184cd8e2662fdf2935a6a96fb74eacbedc377b1acc',NULL,'Phantom Bank Ltd','2026-04-30 07:03:40',NULL,'sara','');
INSERT INTO settlements VALUES('1a4b37ca-a89b-4c6c-ad5d-1e892eaf2e5d','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',15.27999999999999937,'settled','0x0233efef794aea10eaee6642ed19c48b145f934f4040faf763d4a6dada8874d6','bc720ab4f9d70ab8e4b508e49fd43734411c3a0332a8ff2a009beb9eebcfd3a9','Acme International','2026-04-30 07:18:02',235,'sara','');
INSERT INTO settlements VALUES('3586d6de-17d3-468b-8f6c-94c12a406128','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0x8bd29981100ffc04a34fc6b356d80a1669f34a0eca08c50c9e69913ebf74010a',NULL,'Arms Dealer International','2026-04-30 07:18:14',NULL,'sara','');
INSERT INTO settlements VALUES('a66a171a-d83d-4f7d-9ae0-f216cf513a59','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',12000.0,'USD',95.0,'settled','0x572ec56d1159bf8dfe77d392ff0c46a06c7fd84c5d9a26ef58b2158a482242c7',NULL,'Dark Web Exchange','2026-04-30 07:20:02',NULL,'sara','');
INSERT INTO settlements VALUES('7ec89294-b0ab-48f7-8cfc-b574435b2cf1','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',120000.0,'USD',95.0,'settled','0x466be51fc159f6f0ee9c0469eeb57a62644a0a636cc36c08a460f14c7b23ec9c',NULL,'Dark Web Exchange','2026-04-30 07:21:18',NULL,'sara','');
INSERT INTO settlements VALUES('2bcf6047-6616-4afd-82f7-fa846f0dfafe','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100.0,'USD',95.0,'settled','0xda6e43d3af8219fbecbc0e8a2d3b0a2582578dfef3d53239c42d65303a72a9c1',NULL,'Shell Company Alpha','2026-04-30 07:26:39',NULL,'sara','');
INSERT INTO settlements VALUES('cdd48e17-d8ee-4e5c-8cc4-9493696e62f4','Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1',100001.0,'USD',95.0,'settled','0xa614a49298bfa76941ab7692d540d3fc4ee4048694af5e165ff78340ca5ffa23',NULL,'Shell Company Alpha','2026-04-30 07:27:50',NULL,'sara','');
INSERT INTO settlements VALUES('8ee25f20-4e1c-4df2-babd-5e8ac4aa83dd','Sara Mitchell','Shell Company Alpha',15000.0,'USD',95.0,'settled','N/A',NULL,'Shell Company Alpha','2026-04-30 07:34:18',NULL,'sara','');
INSERT INTO settlements VALUES('8718a040-c2ba-4884-9ec7-0a6930ace09e','Sara Mitchell','Shell Company Alpha',12345.0,'USD',95.0,'settled','N/A',NULL,'Shell Company Alpha','2026-04-30 07:36:24',NULL,'sara','');
INSERT INTO settlements VALUES('bed38ecf-008b-4d98-8c1e-6352e115d6f3','Sara Mitchell','Shell Company Alpha',9999.0,'USD',95.0,'settled','N/A',NULL,'Shell Company Alpha','2026-04-30 07:38:15',NULL,'sara','');
CREATE TABLE hitl_queue (
        id TEXT PRIMARY KEY,
        settlement_id TEXT,
        reason TEXT,
        risk_score REAL,
        amount REAL,
        sender TEXT,
        receiver TEXT,
        beneficiary_name TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    , resolution_notes TEXT);
INSERT INTO hitl_queue VALUES('c104fd04-e974-4d4a-bea5-7de5f1c3174c','03e1ccd4-e0b4-4102-90c8-539f0e83fce6','Suspicious round amount; Watchlist match: arms dealer international',95.0,50000.0,'Mohamad Idriss','0x26048125Eba2b869751d06c8e5a7b231cEbfAB3F','Arms Dealer International','approved','mohamad','2026-04-11T12:57:30.980233','2026-04-11 12:50:49',NULL);
INSERT INTO hitl_queue VALUES('165c8abd-e9de-4a0e-83de-234a123cf4ed','f8712457-8caa-4e3a-a87f-9a7376ca03a3','Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (61.3)',95.0,50000.0,'Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236','Dark Web Exchange','approved','mohamad','2026-04-19T13:19:35.054287','2026-04-19 13:06:14',NULL);
INSERT INTO hitl_queue VALUES('ddcb5523-f065-4d17-9525-e5e1077f47a0','a989d2e8-9cd1-47e0-ae09-faf247965866','AML threshold breach: >$150,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: hawala underground; High graph centrality (97.6)',95.0,150000.0,'Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236','Hawala Underground Services','approved','rohit','2026-04-19T13:24:31.073454','2026-04-19 13:19:49',NULL);
INSERT INTO hitl_queue VALUES('6ff68076-f259-4d1b-8a59-9cc1a0e23353','2e39f166-adad-4105-bb58-de798c0cc57c','AML threshold breach: >$150,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: arms dealer international; High graph centrality (57.6)',95.0,150000.0,'Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236','Arms Dealer International','approved','rohit','2026-04-28T21:03:08.551265','2026-04-19 13:28:24',NULL);
INSERT INTO hitl_queue VALUES('dfce6a1c-1ddc-4366-b892-ad3f9fbe632f','78664f0c-5dcb-492f-925e-924a7858cfac','AML threshold breach: >$150,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: phantom bank; High graph centrality (69.6)',95.0,150000.0,'Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236','Phantom Bank Ltd','approved','rohit','2026-04-28T21:03:05.239645','2026-04-19 13:32:22',NULL);
INSERT INTO hitl_queue VALUES('59bda8ac-49b8-451c-a76a-b9426b80d090','1ad20d8a-c95d-4912-9b94-8f35843b475d','Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (63.5)',95.0,50000.0,'Mohamad Idriss','0xdCb685d3E98bdEfcd5f58c992A4Ca3Fc01b5F236','Dark Web Exchange','approved','mohamad','2026-04-28T21:02:12.302136','2026-04-19 13:35:22',NULL);
INSERT INTO hitl_queue VALUES('d10eda3b-501a-4023-a5ed-975e67d38d2d','67fe364b-1756-4b8b-a28c-da42a11db791','Watchlist match: shell company alpha; High graph centrality (70.8)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Shell Company Alpha','approved','mohamad','2026-04-30T06:37:33.127373','2026-04-30 06:37:19',NULL);
INSERT INTO hitl_queue VALUES('71b0e6ee-1439-4d4b-9eeb-dae8cbca8c63','07b9ed5c-e3e9-4a9e-b71b-e25877806263','High-risk jurisdiction (risk=0.91); Watchlist match: offshore haven corp; High graph centrality (75.6)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Offshore Haven Corp','approved','mohamad','2026-04-30T06:40:27.684503','2026-04-30 06:40:18',NULL);
INSERT INTO hitl_queue VALUES('b3703a4f-2c33-49ee-8338-7c50ce7df31a','e1266713-bdd0-4cbc-a441-90476aaf95c4','Watchlist match: hawala underground; High graph centrality (50.5)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Hawala Underground Services','approved','mohamad','2026-04-30T06:46:00.055204','2026-04-30 06:45:51',NULL);
INSERT INTO hitl_queue VALUES('5a0f1fba-e413-4e05-8603-c96c95100933','72970472-a8b6-4007-b0a0-2b6485985fb6','Watchlist match: shell company alpha; High graph centrality (57.2)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Shell Company Alpha','approved','mohamad','2026-04-30T06:47:37.283214','2026-04-30 06:47:29',NULL);
INSERT INTO hitl_queue VALUES('f8f1d2d2-a4a0-4d0c-a07d-29648252d809','46b03514-4b0e-4f65-a13d-d2ad7afe60d0','High-risk jurisdiction (risk=0.97); Watchlist match: shell company alpha; High graph centrality (70.1)',95.0,50.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Shell Company Alpha','approved','mohamad','2026-04-30T06:51:32.826424','2026-04-30 06:51:25',NULL);
INSERT INTO hitl_queue VALUES('d5879f4f-f466-4db7-bcd1-7534eab6bc41','6be9d1ad-8efb-4247-8ff2-8960158291a5','Watchlist match: dark web exchange; High graph centrality (60.3)',95.0,50.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Dark Web Exchange','approved','mohamad','2026-04-30T06:53:45.139563','2026-04-30 06:53:38',NULL);
INSERT INTO hitl_queue VALUES('53e902d8-6483-4e65-8404-4eee9164994c','a17bd722-093d-4b70-8f53-eaaf187b14dd','Watchlist match: narco laundry inc; High graph centrality (73.4)',95.0,50.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Narco Laundry Inc','approved','mohamad','2026-04-30T07:00:12.250734','2026-04-30 07:00:01',NULL);
INSERT INTO hitl_queue VALUES('089f708b-0e3c-4be0-b7c3-c62084dd3c92','e6be7fcf-621e-4de0-b455-2ff4f490ad69','Watchlist match: narco laundry inc; High graph centrality (69.1)',95.0,50.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Narco Laundry Inc','approved','mohamad','2026-04-30T07:01:36.860587','2026-04-30 07:01:23',NULL);
INSERT INTO hitl_queue VALUES('ab3ef2d1-393a-44e7-a113-37ff8a2da607','287370f3-b2b6-48d6-b684-94c440f3254a','AML threshold breach: >$130,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: phantom bank; High graph centrality (79.4)',95.0,130000.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Phantom Bank Ltd','approved','rohit','2026-04-30T07:05:09.497514','2026-04-30 07:03:40',NULL);
INSERT INTO hitl_queue VALUES('6f16d2e0-b3b9-4034-abea-71732d2811a5','3586d6de-17d3-468b-8f6c-94c12a406128','Watchlist match: arms dealer international; High graph centrality (75.7)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Arms Dealer International','approved','mohamad','2026-04-30T07:19:10.285681','2026-04-30 07:18:14',NULL);
INSERT INTO hitl_queue VALUES('a1d9b87c-89b2-4e56-9983-6f5eb39f994a','a66a171a-d83d-4f7d-9ae0-f216cf513a59','Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (65.3)',95.0,12000.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Dark Web Exchange','approved','mohamad','2026-04-30T07:20:22.107046','2026-04-30 07:20:02',NULL);
INSERT INTO hitl_queue VALUES('18c45fa0-3ff6-4f7e-9946-040d0b5ba5b6','7ec89294-b0ab-48f7-8cfc-b574435b2cf1','AML threshold breach: >$120,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (80.8)',95.0,120000.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Dark Web Exchange','approved','rohit','2026-04-30T07:21:42.466613','2026-04-30 07:21:18',NULL);
INSERT INTO hitl_queue VALUES('2a4e6fa9-7390-4e77-ba5a-e0a29bb6ba1c','2bcf6047-6616-4afd-82f7-fa846f0dfafe','High-risk jurisdiction (risk=0.86); Watchlist match: shell company alpha; High graph centrality (68.4)',95.0,100.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Shell Company Alpha','approved','mohamad','2026-04-30T07:27:21.881647','2026-04-30 07:26:39',NULL);
INSERT INTO hitl_queue VALUES('25f086d2-6f03-4761-9126-6d8101bd3c7d','cdd48e17-d8ee-4e5c-8cc4-9493696e62f4','AML threshold breach: >$100,001 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: shell company alpha; High graph centrality (87.4)',95.0,100001.0,'Sara Mitchell','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','Shell Company Alpha','approved','rohit','2026-04-30T07:28:25.597742','2026-04-30 07:27:50',NULL);
INSERT INTO hitl_queue VALUES('8589682d-0b72-485c-8ca9-18b15e307763','8ee25f20-4e1c-4df2-babd-5e8ac4aa83dd','Suspicious round amount; High-risk jurisdiction (risk=0.70); ML ensemble alert (score=65.8); Watchlist match: shell company alpha; High graph centrality (78.0)',95.0,15000.0,'Sara Mitchell','Shell Company Alpha','Shell Company Alpha','approved','mohamad','2026-04-30T07:47:36.066870','2026-04-30 07:34:18',NULL);
INSERT INTO hitl_queue VALUES('0d384658-7914-4e09-a737-7e778a0faad2','8718a040-c2ba-4884-9ec7-0a6930ace09e','Suspicious round amount; Watchlist match: shell company alpha; High graph centrality (61.4)',95.0,12345.0,'Sara Mitchell','Shell Company Alpha','Shell Company Alpha','approved','mohamad','2026-04-30T07:48:08.929043','2026-04-30 07:36:24',NULL);
INSERT INTO hitl_queue VALUES('93e3a8e3-6d0e-41bb-b0dd-1e4439a6feb5','bed38ecf-008b-4d98-8c1e-6352e115d6f3','Structuring/smurfing pattern ($9K-$9.9K); High-risk jurisdiction (risk=0.78); Watchlist match: shell company alpha; High graph centrality (84.4)',95.0,9999.0,'Sara Mitchell','Shell Company Alpha','Shell Company Alpha','approved','mohamad','2026-04-30T07:48:13.456006','2026-04-30 07:38:15',NULL);
CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        actor TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO audit_log VALUES(1,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:33:41');
INSERT INTO audit_log VALUES(2,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:33:48');
INSERT INTO audit_log VALUES(3,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:34:31');
INSERT INTO audit_log VALUES(4,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:41:56');
INSERT INTO audit_log VALUES(5,'settlement','mohamad','{"settlement_id": "11fe31cd-6896-4a8d-934a-f58d019d1033", "risk_score": 6.0, "risk_decision": "approved", "risk_reasons": ["Suspicious round amount"], "risk_breakdown": {"rules": 20, "ml": 0, "nlp": 0, "graph": 0.0}, "shap_values": null, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 4, "uetr": "95400535-9d13-4398-a86e-d2274f04f435", "new_balance": 950000.0}','127.0.0.1','2026-04-11 12:42:12');
INSERT INTO audit_log VALUES(6,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:47:51');
INSERT INTO audit_log VALUES(7,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:47:59');
INSERT INTO audit_log VALUES(8,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:48:46');
INSERT INTO audit_log VALUES(9,'settlement','mohamad','{"settlement_id": "c34bc1a4-7de5-46b5-8a48-a9b2df5118ea", "risk_score": 6.0, "risk_decision": "approved", "risk_reasons": ["Suspicious round amount"], "risk_breakdown": {"rules": 20, "ml": 0, "nlp": 0, "graph": 0.0}, "shap_values": null, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 4, "uetr": "bd98a666-a117-40c0-a331-cf7bb8f82a8d", "new_balance": 900000.0}','127.0.0.1','2026-04-11 12:50:41');
INSERT INTO audit_log VALUES(10,'settlement','mohamad','{"settlement_id": "bfc2966e-1d25-474e-b65f-a5a92b6e1f56", "risk_score": 13.5, "risk_decision": "approved", "risk_reasons": ["Suspicious round amount", "High-risk jurisdiction (risk=0.85)"], "risk_breakdown": {"rules": 45, "ml": 0, "nlp": 0, "graph": 0.0}, "shap_values": null, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 4, "uetr": "ad8abb39-1eb3-4421-b5c1-f5754a2ce130", "new_balance": 850000.0}','127.0.0.1','2026-04-11 12:50:45');
INSERT INTO audit_log VALUES(11,'settlement','mohamad','{"settlement_id": "03e1ccd4-e0b4-4102-90c8-539f0e83fce6", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Suspicious round amount", "Watchlist match: arms dealer international"], "risk_breakdown": {"rules": 20, "ml": 0, "nlp": 100, "graph": 0.0}, "shap_values": null, "status": "blocked", "hitl_id": "c104fd04-e974-4d4a-bea5-7de5f1c3174c", "case_number": "CASE-2026-0001", "message": "Transaction blocked. Compliance case CASE-2026-0001 created. Added to HITL review queue."}','127.0.0.1','2026-04-11 12:50:49');
INSERT INTO audit_log VALUES(12,'settlement','mohamad','{"settlement_id": "2f483b6b-c384-4813-9bdd-c5ab0b49f845", "risk_score": 6.0, "risk_decision": "approved", "risk_reasons": ["Suspicious round amount"], "risk_breakdown": {"rules": 20, "ml": 0, "nlp": 0, "graph": 0.0}, "shap_values": null, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 4, "uetr": "e171222b-301c-4035-9f33-7554e4b58d9d", "new_balance": 800000.0}','127.0.0.1','2026-04-11 12:50:54');
INSERT INTO audit_log VALUES(13,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:51:03');
INSERT INTO audit_log VALUES(14,'amm_swap','mohamad','{"pair": "USD/EUR", "direction": "buy", "in": 1000.0, "out": 916.323676}','127.0.0.1','2026-04-11 12:51:03');
INSERT INTO audit_log VALUES(15,'stake','mohamad','{"pool": "flexible", "amount": 5000.0, "apy": 3.5}','127.0.0.1','2026-04-11 12:51:03');
INSERT INTO audit_log VALUES(16,'escrow_created','mohamad','{"escrow_id": "ccd0bbec-efe1-4a1e-8333-c0c44172d6be", "receiver": "rohit", "amount": 2000.0}','127.0.0.1','2026-04-11 12:51:03');
INSERT INTO audit_log VALUES(17,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:52:28');
INSERT INTO audit_log VALUES(18,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:54:03');
INSERT INTO audit_log VALUES(19,'hitl_approve','mohamad','{"hitl_id": "c104fd04-e974-4d4a-bea5-7de5f1c3174c", "settlement_id": "03e1ccd4-e0b4-4102-90c8-539f0e83fce6", "amount": 50000.0, "sender": "mohamad", "sender_new_balance": 742000.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-11 12:57:30');
INSERT INTO audit_log VALUES(20,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:59:03');
INSERT INTO audit_log VALUES(21,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:59:07');
INSERT INTO audit_log VALUES(22,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:59:08');
INSERT INTO audit_log VALUES(23,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-11 12:59:37');
INSERT INTO audit_log VALUES(24,'settlement','mohamad','{"settlement_id": "9dc830dc-df71-42ca-82d4-c4caa3d20c38", "risk_score": 32.01, "risk_decision": "approved", "risk_reasons": ["Suspicious round amount", "High-risk jurisdiction (risk=0.76)", "High graph centrality (55.5)"], "risk_breakdown": {"rules": 45, "ml": 25.49, "nlp": 0, "graph": 55.47}, "shap_values": {"amount": 0.0565, "hour": 0.0337, "day_of_week": -0.025, "freq_7d": -2.3997, "is_round": 0.0152, "country_risk": 1.6906, "sender_id": -3.4934, "receiver_id": -0.3239, "velocity_1h": -0.1466, "velocity_24h": -0.4038, "velocity_7d": -0.2484, "avg_tx_amount": -0.1124, "std_tx_amount": 0.2119, "amount_zscore": 0.0288, "unique_receivers_7d": -0.1126, "is_new_receiver": 0.0285}, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 839, "uetr": "19199f42-bd3e-4be8-a285-c2fbc1e2b9ff", "new_balance": 692000.0}','127.0.0.1','2026-04-19 13:05:40');
INSERT INTO audit_log VALUES(25,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:06:46');
INSERT INTO audit_log VALUES(26,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:12:25');
INSERT INTO audit_log VALUES(27,'login_failed','mohamad','{"reason": "invalid credentials"}','127.0.0.1','2026-04-19 13:18:00');
INSERT INTO audit_log VALUES(28,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:18:26');
INSERT INTO audit_log VALUES(29,'hitl_approve','mohamad','{"hitl_id": "165c8abd-e9de-4a0e-83de-234a123cf4ed", "settlement_id": "f8712457-8caa-4e3a-a87f-9a7376ca03a3", "amount": 50000.0, "sender": "mohamad", "sender_new_balance": 642000.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-19 13:19:35');
INSERT INTO audit_log VALUES(30,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:19:36');
INSERT INTO audit_log VALUES(31,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:23:58');
INSERT INTO audit_log VALUES(32,'virtual_card_generated','mohamad','{"id": "8e3880a1-b806-476c-a010-fb704d04c70b", "limit": 5000.0}','127.0.0.1','2026-04-19 13:23:58');
INSERT INTO audit_log VALUES(33,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:24:09');
INSERT INTO audit_log VALUES(34,'login_success','rohit','{"role": "operator"}','127.0.0.1','2026-04-19 13:24:09');
INSERT INTO audit_log VALUES(35,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:24:15');
INSERT INTO audit_log VALUES(36,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:24:24');
INSERT INTO audit_log VALUES(37,'login_success','rohit','{"role": "operator"}','127.0.0.1','2026-04-19 13:24:24');
INSERT INTO audit_log VALUES(38,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:24:30');
INSERT INTO audit_log VALUES(39,'login_success','rohit','{"role": "operator"}','127.0.0.1','2026-04-19 13:24:30');
INSERT INTO audit_log VALUES(40,'four_eyes_first_approval','mohamad','{"hitl_id": "ddcb5523-f065-4d17-9525-e5e1077f47a0", "amount": 150000.0}','127.0.0.1','2026-04-19 13:24:31');
INSERT INTO audit_log VALUES(41,'hitl_approve','rohit','{"hitl_id": "ddcb5523-f065-4d17-9525-e5e1077f47a0", "settlement_id": "a989d2e8-9cd1-47e0-ae09-faf247965866", "amount": 150000.0, "sender": "mohamad", "sender_new_balance": 492000.0, "tx_hash": "N/A", "four_eyes": true}','127.0.0.1','2026-04-19 13:24:31');
INSERT INTO audit_log VALUES(42,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-19 13:34:54');
INSERT INTO audit_log VALUES(43,'four_eyes_first_approval','mohamad','{"hitl_id": "dfce6a1c-1ddc-4366-b892-ad3f9fbe632f", "amount": 150000.0}','127.0.0.1','2026-04-19 13:34:59');
INSERT INTO audit_log VALUES(44,'four_eyes_first_approval','mohamad','{"hitl_id": "6ff68076-f259-4d1b-8a59-9cc1a0e23353", "amount": 150000.0}','127.0.0.1','2026-04-19 13:35:01');
INSERT INTO audit_log VALUES(45,'login_success','rohit','{"role": "compliance"}','127.0.0.1','2026-04-28 20:43:34');
INSERT INTO audit_log VALUES(46,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-28 20:44:07');
INSERT INTO audit_log VALUES(47,'p2p_transfer','sara','{"to": "james", "amount": 500.0, "note": ""}','127.0.0.1','2026-04-28 20:44:53');
INSERT INTO audit_log VALUES(48,'card_request_submitted','sara','{"id": "09708681-d6af-4ae3-a5a7-008363a9154c", "label": "Online Shopping", "limit": 2000.0}','127.0.0.1','2026-04-28 20:45:21');
INSERT INTO audit_log VALUES(49,'beneficiary_added','sara','{"id": "2d962332-c61e-430a-b4d9-5797f836a7aa", "name": "Test Corp"}','127.0.0.1','2026-04-28 20:45:53');
INSERT INTO audit_log VALUES(50,'amm_swap','sara','{"pair": "USD/EUR", "direction": "buy", "in": 100.0, "out": 91.531683}','127.0.0.1','2026-04-28 20:46:52');
INSERT INTO audit_log VALUES(51,'login_success','james','{"role": "client"}','127.0.0.1','2026-04-28 20:47:18');
INSERT INTO audit_log VALUES(52,'login_success','sriram','{"role": "operator"}','127.0.0.1','2026-04-28 20:48:01');
INSERT INTO audit_log VALUES(53,'login_success','walid','{"role": "auditor"}','127.0.0.1','2026-04-28 20:48:37');
INSERT INTO audit_log VALUES(54,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 20:55:19');
INSERT INTO audit_log VALUES(55,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 20:59:26');
INSERT INTO audit_log VALUES(56,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:01:27');
INSERT INTO audit_log VALUES(57,'card_approved','mohamad','{"card_id": "09708681-d6af-4ae3-a5a7-008363a9154c", "card_owner": "sara"}','127.0.0.1','2026-04-28 21:02:07');
INSERT INTO audit_log VALUES(58,'hitl_approve','mohamad','{"hitl_id": "59bda8ac-49b8-451c-a76a-b9426b80d090", "settlement_id": "1ad20d8a-c95d-4912-9b94-8f35843b475d", "amount": 50000.0, "sender": "mohamad", "sender_new_balance": 492000.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-28 21:02:12');
INSERT INTO audit_log VALUES(59,'login_success','rohit','{"role": "compliance"}','127.0.0.1','2026-04-28 21:03:00');
INSERT INTO audit_log VALUES(60,'hitl_approve','rohit','{"hitl_id": "dfce6a1c-1ddc-4366-b892-ad3f9fbe632f", "settlement_id": "78664f0c-5dcb-492f-925e-924a7858cfac", "amount": 150000.0, "sender": "mohamad", "sender_new_balance": 492000.0, "tx_hash": "N/A", "four_eyes": true}','127.0.0.1','2026-04-28 21:03:05');
INSERT INTO audit_log VALUES(61,'hitl_approve','rohit','{"hitl_id": "6ff68076-f259-4d1b-8a59-9cc1a0e23353", "settlement_id": "2e39f166-adad-4105-bb58-de798c0cc57c", "amount": 150000.0, "sender": "mohamad", "sender_new_balance": 492000.0, "tx_hash": "N/A", "four_eyes": true}','127.0.0.1','2026-04-28 21:03:08');
INSERT INTO audit_log VALUES(62,'retrain','mohamad','{"status": "initiated"}','127.0.0.1','2026-04-28 21:04:20');
INSERT INTO audit_log VALUES(63,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-28 21:05:34');
INSERT INTO audit_log VALUES(64,'settlement','sara','{"settlement_id": "68782f68-cce2-4c12-a50f-181a367510a9", "risk_score": 15.16, "risk_decision": "approved", "risk_reasons": ["High graph centrality (63.8)"], "risk_breakdown": {"rules": 0, "ml": 13.98, "nlp": 0, "graph": 63.78}, "shap_values": {"amount": -1.705, "hour": -0.2148, "day_of_week": -0.0442, "tx_frequency_7d": 0.0487, "is_round_amount": 0.094, "country_risk_score": -2.9048, "sender_id": -1.9743, "receiver_id": 0.1098, "velocity_1h": -0.0852, "velocity_24h": -0.3108, "velocity_7d": -0.2141, "avg_tx_amount": -0.1252, "std_tx_amount": 0.1197, "amount_zscore": 0.0522, "unique_receivers_7d": -0.1809, "is_new_receiver": 0.0376}, "status": "settled", "tx_hash": "N/A", "blockchain": null, "settlement_time_ms": 726, "uetr": "3caf9cc9-c6bd-4096-bb69-f9ed63f6738c", "new_balance": 849300.0}','127.0.0.1','2026-04-28 21:06:13');
INSERT INTO audit_log VALUES(65,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-28 21:07:15');
INSERT INTO audit_log VALUES(66,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-28 21:11:37');
INSERT INTO audit_log VALUES(67,'card_request_submitted','sara','{"id": "227932fe-6ca4-4601-9145-276866041581", "label": "Trading Card", "limit": 50000.0}','127.0.0.1','2026-04-28 21:12:42');
INSERT INTO audit_log VALUES(68,'card_request_submitted','sara','{"id": "831d1ff8-9cf9-4f25-8513-fbdf285193e3", "label": "International Card", "limit": 50000.0}','127.0.0.1','2026-04-28 21:13:03');
INSERT INTO audit_log VALUES(69,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-28 21:17:23');
INSERT INTO audit_log VALUES(70,'login_failed','alice','{"reason": "invalid credentials"}','127.0.0.1','2026-04-28 21:17:27');
INSERT INTO audit_log VALUES(71,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:17:50');
INSERT INTO audit_log VALUES(72,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:17:57');
INSERT INTO audit_log VALUES(73,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:20:21');
INSERT INTO audit_log VALUES(74,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:33:39');
INSERT INTO audit_log VALUES(75,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:34:13');
INSERT INTO audit_log VALUES(76,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:49:33');
INSERT INTO audit_log VALUES(77,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:49:58');
INSERT INTO audit_log VALUES(78,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:52:03');
INSERT INTO audit_log VALUES(79,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-28 21:57:49');
INSERT INTO audit_log VALUES(80,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:00:40');
INSERT INTO audit_log VALUES(81,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 06:36:58');
INSERT INTO audit_log VALUES(82,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:37:13');
INSERT INTO audit_log VALUES(83,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:37:18');
INSERT INTO audit_log VALUES(84,'corridor_created','mohamad','{"corridor_id": 6, "name": "KSA \u2192 Egypt"}','127.0.0.1','2026-04-29 06:37:18');
INSERT INTO audit_log VALUES(85,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:42:52');
INSERT INTO audit_log VALUES(86,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:49:23');
INSERT INTO audit_log VALUES(87,'corridor_created','mohamad','{"corridor_id": 7, "name": "Test \u2192 Corridor"}','127.0.0.1','2026-04-29 06:49:23');
INSERT INTO audit_log VALUES(88,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 06:49:28');
INSERT INTO audit_log VALUES(89,'corridor_created','mohamad','{"corridor_id": 8, "name": "Saudi Arabia \u2192 Qatar"}','127.0.0.1','2026-04-29 06:51:17');
INSERT INTO audit_log VALUES(90,'corridor_created','mohamad','{"corridor_id": 9, "name": "Saudi Arabia \u2192 Germany"}','127.0.0.1','2026-04-29 06:52:07');
INSERT INTO audit_log VALUES(91,'corridor_created','mohamad','{"corridor_id": 10, "name": "Lebanon \u2192 Germany"}','127.0.0.1','2026-04-29 06:52:40');
INSERT INTO audit_log VALUES(92,'card_approved','mohamad','{"card_id": "831d1ff8-9cf9-4f25-8513-fbdf285193e3", "card_owner": "sara"}','127.0.0.1','2026-04-29 06:53:37');
INSERT INTO audit_log VALUES(93,'card_approved','mohamad','{"card_id": "227932fe-6ca4-4601-9145-276866041581", "card_owner": "sara"}','127.0.0.1','2026-04-29 06:53:38');
INSERT INTO audit_log VALUES(94,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:01:08');
INSERT INTO audit_log VALUES(95,'login_success','sriram','{"role": "operator"}','127.0.0.1','2026-04-29 07:01:55');
INSERT INTO audit_log VALUES(96,'beneficiary_deleted','sriram','{"id": "2d962332-c61e-430a-b4d9-5797f836a7aa"}','127.0.0.1','2026-04-29 07:02:05');
INSERT INTO audit_log VALUES(97,'beneficiary_added','sriram','{"id": "1151c1ea-b532-4551-a6ca-906f12a9efd0", "name": "Mohamad k. Idriss"}','127.0.0.1','2026-04-29 07:02:46');
INSERT INTO audit_log VALUES(98,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-29 07:09:46');
INSERT INTO audit_log VALUES(99,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:20:39');
INSERT INTO audit_log VALUES(100,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-29 07:20:49');
INSERT INTO audit_log VALUES(101,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:31:13');
INSERT INTO audit_log VALUES(102,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:39:18');
INSERT INTO audit_log VALUES(103,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:39:25');
INSERT INTO audit_log VALUES(104,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:42:47');
INSERT INTO audit_log VALUES(105,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:44:09');
INSERT INTO audit_log VALUES(106,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:44:45');
INSERT INTO audit_log VALUES(107,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:47:43');
INSERT INTO audit_log VALUES(108,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:52:31');
INSERT INTO audit_log VALUES(109,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 07:55:01');
INSERT INTO audit_log VALUES(110,'corridor_created','mohamad','{"corridor_id": 11, "name": "India \u2192 Lebanon"}','127.0.0.1','2026-04-29 07:59:49');
INSERT INTO audit_log VALUES(111,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:07:05');
INSERT INTO audit_log VALUES(112,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:07:26');
INSERT INTO audit_log VALUES(113,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:08:23');
INSERT INTO audit_log VALUES(114,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:08:49');
INSERT INTO audit_log VALUES(115,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:11:50');
INSERT INTO audit_log VALUES(116,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:12:24');
INSERT INTO audit_log VALUES(117,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:13:53');
INSERT INTO audit_log VALUES(118,'case_updated','mohamad','{"case_id": "4b08ec30-09aa-4de1-9ee8-27755c446feb", "updates": {"status": "resolved", "assigned_to": "Walid", "resolution": "resolved"}}','127.0.0.1','2026-04-29 08:14:52');
INSERT INTO audit_log VALUES(119,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 08:18:00');
INSERT INTO audit_log VALUES(120,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:18:12');
INSERT INTO audit_log VALUES(121,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:18:13');
INSERT INTO audit_log VALUES(122,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:18:40');
INSERT INTO audit_log VALUES(123,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:22:55');
INSERT INTO audit_log VALUES(124,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:24:34');
INSERT INTO audit_log VALUES(125,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:24:53');
INSERT INTO audit_log VALUES(126,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:25:00');
INSERT INTO audit_log VALUES(127,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 08:36:47');
INSERT INTO audit_log VALUES(128,'corridor_created','mohamad','{"corridor_id": 27, "name": "United States - United Kingdom"}','127.0.0.1','2026-04-29 08:58:47');
INSERT INTO audit_log VALUES(129,'corridor_created','mohamad','{"corridor_id": 35, "name": "France - Nigeria"}','127.0.0.1','2026-04-29 10:32:50');
INSERT INTO audit_log VALUES(130,'corridor_created','mohamad','{"corridor_id": 36, "name": "Lebanon - Australia"}','127.0.0.1','2026-04-29 10:34:12');
INSERT INTO audit_log VALUES(131,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-29 10:35:49');
INSERT INTO audit_log VALUES(132,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 12:10:03');
INSERT INTO audit_log VALUES(133,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 12:10:06');
INSERT INTO audit_log VALUES(134,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 12:10:10');
INSERT INTO audit_log VALUES(135,'login_failed','admin','{"reason": "invalid credentials"}','127.0.0.1','2026-04-29 12:10:13');
INSERT INTO audit_log VALUES(136,'scheduled_payment_created','sara','{"recipient": "Sriram", "amount": 200.0, "frequency": "monthly"}','127.0.0.1','2026-04-30 06:32:40');
INSERT INTO audit_log VALUES(137,'settlement','sara','{"settlement_id": "67fe364b-1756-4b8b-a28c-da42a11db791", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: shell company alpha", "High graph centrality (70.8)"], "risk_breakdown": {"rules": 0, "ml": 20.3, "nlp": 100, "graph": 70.83}, "shap_values": {"amount": -3.0764, "hour": 0.04, "day_of_week": -0.0231, "tx_frequency_7d": -0.7337, "is_round_amount": 0.003, "country_risk_score": 1.2235, "sender_id": -0.1901, "receiver_id": 0.0239, "velocity_1h": -0.1313, "velocity_24h": -0.3461, "velocity_7d": -0.3175, "avg_tx_amount": -0.1828, "std_tx_amount": 0.2103, "amount_zscore": 0.1238, "unique_receivers_7d": -0.2119, "is_new_receiver": 0.0493}, "status": "blocked", "hitl_id": "d10eda3b-501a-4023-a5ed-975e67d38d2d", "case_number": "CASE-2026-0002", "new_balance": 849200.0, "message": "Transaction blocked. Compliance case CASE-2026-0002 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:37:19');
INSERT INTO audit_log VALUES(138,'hitl_approve','mohamad','{"hitl_id": "d10eda3b-501a-4023-a5ed-975e67d38d2d", "settlement_id": "67fe364b-1756-4b8b-a28c-da42a11db791", "amount": 100.0, "sender": "sara", "sender_new_balance": 849200.0, "tx_hash": "0xb6ba39ba76c69fa2cda0de811f4255b754c5ecd6853ace761b806598401c84a9", "four_eyes": false}','127.0.0.1','2026-04-30 06:37:33');
INSERT INTO audit_log VALUES(139,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 06:38:28');
INSERT INTO audit_log VALUES(140,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 06:38:29');
INSERT INTO audit_log VALUES(141,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 06:38:39');
INSERT INTO audit_log VALUES(142,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 06:38:46');
INSERT INTO audit_log VALUES(143,'settlement','sara','{"settlement_id": "07b9ed5c-e3e9-4a9e-b71b-e25877806263", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["High-risk jurisdiction (risk=0.91)", "Watchlist match: offshore haven corp", "High graph centrality (75.6)"], "risk_breakdown": {"rules": 25, "ml": 24.85, "nlp": 100, "graph": 75.57}, "shap_values": {"amount": -3.3071, "hour": 0.0602, "day_of_week": -0.0198, "tx_frequency_7d": -0.0104, "is_round_amount": -0.0402, "country_risk_score": 1.7088, "sender_id": -0.2195, "receiver_id": -0.3369, "velocity_1h": -0.1563, "velocity_24h": -0.3416, "velocity_7d": -0.2397, "avg_tx_amount": -0.1188, "std_tx_amount": 0.2981, "amount_zscore": 0.0831, "unique_receivers_7d": -0.0264, "is_new_receiver": 0.0138}, "status": "blocked", "hitl_id": "71b0e6ee-1439-4d4b-9eeb-dae8cbca8c63", "case_number": "CASE-2026-0003", "new_balance": 849100.0, "message": "Transaction blocked. Compliance case CASE-2026-0003 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:40:18');
INSERT INTO audit_log VALUES(144,'hitl_approve','mohamad','{"hitl_id": "71b0e6ee-1439-4d4b-9eeb-dae8cbca8c63", "settlement_id": "07b9ed5c-e3e9-4a9e-b71b-e25877806263", "amount": 100.0, "sender": "sara", "sender_new_balance": 849100.0, "tx_hash": "0x4f6076712bd919af336fa4a3afbc94baf982cf89d1e91ee9a75f0121834eb999", "four_eyes": false}','127.0.0.1','2026-04-30 06:40:27');
INSERT INTO audit_log VALUES(145,'settlement','sara','{"settlement_id": "e1266713-bdd0-4cbc-a441-90476aaf95c4", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: hawala underground", "High graph centrality (50.5)"], "risk_breakdown": {"rules": 0, "ml": 13.25, "nlp": 100, "graph": 50.48}, "shap_values": {"amount": -1.7006, "hour": 0.0474, "day_of_week": -0.0263, "tx_frequency_7d": -0.2318, "is_round_amount": 0.009, "country_risk_score": -0.7159, "sender_id": -2.0238, "receiver_id": -2.0637, "velocity_1h": -0.0995, "velocity_24h": -0.3199, "velocity_7d": -0.2515, "avg_tx_amount": -0.241, "std_tx_amount": 0.122, "amount_zscore": 0.078, "unique_receivers_7d": -0.0804, "is_new_receiver": 0.0207}, "status": "blocked", "hitl_id": "b3703a4f-2c33-49ee-8338-7c50ce7df31a", "case_number": "CASE-2026-0004", "new_balance": 849000.0, "message": "Transaction blocked. Compliance case CASE-2026-0004 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:45:51');
INSERT INTO audit_log VALUES(146,'hitl_approve','mohamad','{"hitl_id": "b3703a4f-2c33-49ee-8338-7c50ce7df31a", "settlement_id": "e1266713-bdd0-4cbc-a441-90476aaf95c4", "amount": 100.0, "sender": "sara", "sender_new_balance": 849000.0, "tx_hash": "0xb62b58cc60422dac1eaf600400ef74ee6c990123aa270a9b00bdd374391c66e9", "four_eyes": false}','127.0.0.1','2026-04-30 06:46:00');
INSERT INTO audit_log VALUES(147,'settlement','sara','{"settlement_id": "6cf0dc36-1b5f-4392-bbf7-0581ce7b405f", "risk_score": 25.65, "risk_decision": "approved", "risk_reasons": ["High-risk jurisdiction (risk=0.99)"], "risk_breakdown": {"rules": 25, "ml": 26.98, "nlp": 0, "graph": 49.07}, "shap_values": {"amount": -3.2791, "hour": 0.0726, "day_of_week": -0.0152, "tx_frequency_7d": 0.1078, "is_round_amount": -0.0104, "country_risk_score": 1.9617, "sender_id": -0.2339, "receiver_id": -0.1781, "velocity_1h": -0.1624, "velocity_24h": -0.3898, "velocity_7d": -0.2491, "avg_tx_amount": -0.0723, "std_tx_amount": 0.2996, "amount_zscore": 0.083, "unique_receivers_7d": -0.0377, "is_new_receiver": 0.0159}, "status": "settled", "tx_hash": "0x47063f4be190676a0ef406c7f7bdb2c292b595a7314d0b64569af93dd726a45d", "blockchain": {"tx_hash": "0x47063f4be190676a0ef406c7f7bdb2c292b595a7314d0b64569af93dd726a45d", "block_number": 345, "gas_used": 32113, "status": "failed"}, "settlement_time_ms": 157, "uetr": "f218fcd3-7dc4-4f90-b40a-245efc47c03c", "new_balance": 848900.0}','127.0.0.1','2026-04-30 06:47:15');
INSERT INTO audit_log VALUES(148,'settlement','sara','{"settlement_id": "72970472-a8b6-4007-b0a0-2b6485985fb6", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: shell company alpha", "High graph centrality (57.2)"], "risk_breakdown": {"rules": 0, "ml": 14.9, "nlp": 100, "graph": 57.17}, "shap_values": {"amount": -2.9733, "hour": 0.13, "day_of_week": -0.0163, "tx_frequency_7d": -0.1789, "is_round_amount": -0.0013, "country_risk_score": -0.8436, "sender_id": -0.3241, "receiver_id": -0.0426, "velocity_1h": -0.1813, "velocity_24h": -0.4643, "velocity_7d": -0.3082, "avg_tx_amount": -0.2548, "std_tx_amount": 0.1468, "amount_zscore": 0.1647, "unique_receivers_7d": -0.0981, "is_new_receiver": 0.017}, "status": "blocked", "hitl_id": "5a0f1fba-e413-4e05-8603-c96c95100933", "case_number": "CASE-2026-0005", "new_balance": 848800.0, "message": "Transaction blocked. Compliance case CASE-2026-0005 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:47:29');
INSERT INTO audit_log VALUES(149,'hitl_approve','mohamad','{"hitl_id": "5a0f1fba-e413-4e05-8603-c96c95100933", "settlement_id": "72970472-a8b6-4007-b0a0-2b6485985fb6", "amount": 100.0, "sender": "sara", "sender_new_balance": 848800.0, "tx_hash": "0x97bacaf95f9e6b3e3951ab451a709499efdec975b7554640dddd738b855263b2", "four_eyes": false}','127.0.0.1','2026-04-30 06:47:37');
INSERT INTO audit_log VALUES(150,'settlement','sara','{"settlement_id": "ac9e37e7-b23e-486c-8386-9d883b50a58a", "risk_score": 16.2, "risk_decision": "approved", "risk_reasons": ["High graph centrality (72.4)"], "risk_breakdown": {"rules": 0, "ml": 13.34, "nlp": 0, "graph": 72.4}, "shap_values": {"amount": -1.7565, "hour": 0.072, "day_of_week": -0.0375, "tx_frequency_7d": -1.5276, "is_round_amount": 0.008, "country_risk_score": -2.9441, "sender_id": -0.2396, "receiver_id": -0.1082, "velocity_1h": -0.0802, "velocity_24h": -0.2465, "velocity_7d": -0.222, "avg_tx_amount": -0.1119, "std_tx_amount": 0.2454, "amount_zscore": 0.1331, "unique_receivers_7d": -0.0751, "is_new_receiver": 0.0147}, "status": "settled", "tx_hash": "0x0a65e8e8fbfaf60d20e9203461c92cef8e5538a35bd29167e2e198a5d0c1bb41", "blockchain": {"tx_hash": "0x0a65e8e8fbfaf60d20e9203461c92cef8e5538a35bd29167e2e198a5d0c1bb41", "block_number": 347, "gas_used": 32113, "status": "failed"}, "settlement_time_ms": 162, "uetr": "f64bb252-e8d0-495f-b39e-bd23540b8240", "new_balance": 848700.0}','127.0.0.1','2026-04-30 06:51:11');
INSERT INTO audit_log VALUES(151,'settlement','sara','{"settlement_id": "46b03514-4b0e-4f65-a13d-d2ad7afe60d0", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["High-risk jurisdiction (risk=0.97)", "Watchlist match: shell company alpha", "High graph centrality (70.1)"], "risk_breakdown": {"rules": 25, "ml": 16.12, "nlp": 100, "graph": 70.07}, "shap_values": {"amount": -1.8618, "hour": -0.0184, "day_of_week": -0.0325, "tx_frequency_7d": -0.01, "is_round_amount": 0.0062, "country_risk_score": 1.3015, "sender_id": -2.4408, "receiver_id": -2.4414, "velocity_1h": -0.0717, "velocity_24h": -0.3068, "velocity_7d": -0.2401, "avg_tx_amount": -0.0861, "std_tx_amount": 0.242, "amount_zscore": 0.0657, "unique_receivers_7d": -0.0781, "is_new_receiver": 0.0198}, "status": "blocked", "hitl_id": "f8f1d2d2-a4a0-4d0c-a07d-29648252d809", "case_number": "CASE-2026-0006", "new_balance": 848650.0, "message": "Transaction blocked. Compliance case CASE-2026-0006 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:51:25');
INSERT INTO audit_log VALUES(152,'hitl_approve','mohamad','{"hitl_id": "f8f1d2d2-a4a0-4d0c-a07d-29648252d809", "settlement_id": "46b03514-4b0e-4f65-a13d-d2ad7afe60d0", "amount": 50.0, "sender": "sara", "sender_new_balance": 848650.0, "tx_hash": "0x1b1cf0dba2b6cda45b56630841c6c103027136934cfba16a811eb6df8bcc002e", "four_eyes": false}','127.0.0.1','2026-04-30 06:51:32');
INSERT INTO audit_log VALUES(153,'settlement','sara','{"settlement_id": "8ea10b86-bde0-4754-a235-4fdbefff6785", "risk_score": 28.15, "risk_decision": "approved", "risk_reasons": ["High-risk jurisdiction (risk=0.88)", "High graph centrality (64.0)"], "risk_breakdown": {"rules": 25, "ml": 27.6, "nlp": 0, "graph": 64.03}, "shap_values": {"amount": -3.1893, "hour": 0.0736, "day_of_week": -0.0029, "tx_frequency_7d": -0.1794, "is_round_amount": -0.038, "country_risk_score": 1.7747, "sender_id": -0.0733, "receiver_id": -0.1038, "velocity_1h": -0.2139, "velocity_24h": -0.2407, "velocity_7d": -0.2427, "avg_tx_amount": -0.0949, "std_tx_amount": 0.3939, "amount_zscore": 0.0871, "unique_receivers_7d": -0.061, "is_new_receiver": 0.016}, "status": "settled", "tx_hash": "0x5824439ed5325434191178f38da24f715c8f5b8f687d9444d9bd1999592b1f3e", "blockchain": {"tx_hash": "0x5824439ed5325434191178f38da24f715c8f5b8f687d9444d9bd1999592b1f3e", "block_number": 356, "gas_used": 32113, "status": "failed"}, "settlement_time_ms": 572, "uetr": "41ad43e5-7365-4cca-851a-99f787875357", "new_balance": 848600.0}','127.0.0.1','2026-04-30 06:53:26');
INSERT INTO audit_log VALUES(154,'settlement','sara','{"settlement_id": "6be9d1ad-8efb-4247-8ff2-8960158291a5", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: dark web exchange", "High graph centrality (60.3)"], "risk_breakdown": {"rules": 0, "ml": 14.03, "nlp": 100, "graph": 60.34}, "shap_values": {"amount": -2.418, "hour": 0.0329, "day_of_week": -0.0105, "tx_frequency_7d": -0.3761, "is_round_amount": 0.0071, "country_risk_score": 0.3942, "sender_id": -3.0238, "receiver_id": -0.2382, "velocity_1h": -0.1731, "velocity_24h": -0.3541, "velocity_7d": -0.2576, "avg_tx_amount": -0.1891, "std_tx_amount": 0.1584, "amount_zscore": 0.0944, "unique_receivers_7d": -0.0605, "is_new_receiver": 0.0149}, "status": "blocked", "hitl_id": "d5879f4f-f466-4db7-bcd1-7534eab6bc41", "case_number": "CASE-2026-0007", "new_balance": 848550.0, "message": "Transaction blocked. Compliance case CASE-2026-0007 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 06:53:38');
INSERT INTO audit_log VALUES(155,'hitl_approve','mohamad','{"hitl_id": "d5879f4f-f466-4db7-bcd1-7534eab6bc41", "settlement_id": "6be9d1ad-8efb-4247-8ff2-8960158291a5", "amount": 50.0, "sender": "sara", "sender_new_balance": 848550.0, "tx_hash": "0xacd0aa7ee1934890840d02277636cc3dbb5ee186389e8d83d3b5d430f39ddb30", "four_eyes": false}','127.0.0.1','2026-04-30 06:53:45');
INSERT INTO audit_log VALUES(156,'settlement','sara','{"settlement_id": "718834be-5be3-444e-802c-b3cd18823ba3", "risk_score": 25.68, "risk_decision": "approved", "risk_reasons": ["High-risk jurisdiction (risk=0.81)", "High graph centrality (68.4)"], "risk_breakdown": {"rules": 25, "ml": 19.79, "nlp": 0, "graph": 68.39}, "shap_values": {"amount": -2.3727, "hour": 0.0863, "day_of_week": -0.015, "tx_frequency_7d": -2.215, "is_round_amount": -0.0351, "country_risk_score": 1.5546, "sender_id": -0.2464, "receiver_id": -0.4088, "velocity_1h": -0.1656, "velocity_24h": -0.2015, "velocity_7d": -0.2304, "avg_tx_amount": -0.0867, "std_tx_amount": 0.3747, "amount_zscore": 0.0803, "unique_receivers_7d": -0.0673, "is_new_receiver": 0.0159}, "status": "settled", "tx_hash": "0x8192eaf386098307222a182b752b48e6e409aaac5c5f17289e79ab877f9ecf43", "blockchain": {"tx_hash": "0x8192eaf386098307222a182b752b48e6e409aaac5c5f17289e79ab877f9ecf43", "block_number": 365, "gas_used": 32113, "status": "failed"}, "settlement_time_ms": 666, "uetr": "0d6ab686-dd50-45b7-bc2d-a31a8fd5cf4d", "new_balance": 848500.0}','127.0.0.1','2026-04-30 06:59:32');
INSERT INTO audit_log VALUES(157,'settlement','sara','{"settlement_id": "a17bd722-093d-4b70-8f53-eaaf187b14dd", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: narco laundry inc", "High graph centrality (73.4)"], "risk_breakdown": {"rules": 0, "ml": 12.84, "nlp": 100, "graph": 73.45}, "shap_values": {"amount": -2.0931, "hour": 0.103, "day_of_week": -0.0277, "tx_frequency_7d": 0.0764, "is_round_amount": 0.0205, "country_risk_score": -0.6157, "sender_id": -2.4061, "receiver_id": -0.3883, "velocity_1h": -0.0541, "velocity_24h": -0.3618, "velocity_7d": -0.343, "avg_tx_amount": -0.022, "std_tx_amount": 0.3181, "amount_zscore": 0.1652, "unique_receivers_7d": -0.1136, "is_new_receiver": 0.0141}, "status": "blocked", "hitl_id": "53e902d8-6483-4e65-8404-4eee9164994c", "case_number": "CASE-2026-0008", "new_balance": 848450.0, "message": "Transaction blocked. Compliance case CASE-2026-0008 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:00:01');
INSERT INTO audit_log VALUES(158,'hitl_approve','mohamad','{"hitl_id": "53e902d8-6483-4e65-8404-4eee9164994c", "settlement_id": "a17bd722-093d-4b70-8f53-eaaf187b14dd", "amount": 50.0, "sender": "sara", "sender_new_balance": 848450.0, "tx_hash": "0x7782d08e56a8ad133b28093ac79494bf8cf35a21dbe80eef196f985186c86def", "four_eyes": false}','127.0.0.1','2026-04-30 07:00:12');
INSERT INTO audit_log VALUES(159,'settlement','sara','{"settlement_id": "e6be7fcf-621e-4de0-b455-2ff4f490ad69", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: narco laundry inc", "High graph centrality (69.1)"], "risk_breakdown": {"rules": 0, "ml": 17.56, "nlp": 100, "graph": 69.14}, "shap_values": {"amount": -3.48, "hour": 0.0545, "day_of_week": -0.0222, "tx_frequency_7d": -0.0126, "is_round_amount": -0.025, "country_risk_score": 0.0828, "sender_id": -0.144, "receiver_id": -0.4621, "velocity_1h": -0.1949, "velocity_24h": -0.4268, "velocity_7d": -0.2816, "avg_tx_amount": -0.3203, "std_tx_amount": 0.0926, "amount_zscore": 0.1483, "unique_receivers_7d": -0.0157, "is_new_receiver": 0.0139}, "status": "blocked", "hitl_id": "089f708b-0e3c-4be0-b7c3-c62084dd3c92", "case_number": "CASE-2026-0009", "new_balance": 848400.0, "message": "Transaction blocked. Compliance case CASE-2026-0009 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:01:23');
INSERT INTO audit_log VALUES(160,'hitl_approve','mohamad','{"hitl_id": "089f708b-0e3c-4be0-b7c3-c62084dd3c92", "settlement_id": "e6be7fcf-621e-4de0-b455-2ff4f490ad69", "amount": 50.0, "sender": "sara", "sender_new_balance": 848400.0, "tx_hash": "0x802c0b50ccb9e901a7c0494e19057d92f97e49f5064675c7cdae207908d595fa", "four_eyes": false}','127.0.0.1','2026-04-30 07:01:36');
INSERT INTO audit_log VALUES(161,'settlement','sara','{"settlement_id": "287370f3-b2b6-48d6-b684-94c440f3254a", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["AML threshold breach: >$130,000 exceeds $100K reporting limit", "Suspicious round amount", "Watchlist match: phantom bank", "High graph centrality (79.4)"], "risk_breakdown": {"rules": 70, "ml": 24.81, "nlp": 100, "graph": 79.44}, "shap_values": {"amount": -0.2441, "hour": 0.1327, "day_of_week": -0.0332, "tx_frequency_7d": -0.2853, "is_round_amount": -0.0095, "country_risk_score": -3.2225, "sender_id": 0.1985, "receiver_id": -2.4691, "velocity_1h": -0.0559, "velocity_24h": -0.3474, "velocity_7d": -0.224, "avg_tx_amount": -0.078, "std_tx_amount": 0.2123, "amount_zscore": 0.1196, "unique_receivers_7d": -0.1021, "is_new_receiver": 0.0192}, "status": "blocked", "hitl_id": "ab3ef2d1-393a-44e7-a113-37ff8a2da607", "case_number": "CASE-2026-0010", "new_balance": 718400.0, "message": "Transaction blocked. Compliance case CASE-2026-0010 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:03:40');
INSERT INTO audit_log VALUES(162,'four_eyes_first_approval','mohamad','{"hitl_id": "ab3ef2d1-393a-44e7-a113-37ff8a2da607", "amount": 130000.0}','127.0.0.1','2026-04-30 07:03:47');
INSERT INTO audit_log VALUES(163,'login_success','rohit','{"role": "compliance"}','127.0.0.1','2026-04-30 07:05:02');
INSERT INTO audit_log VALUES(164,'hitl_approve','rohit','{"hitl_id": "ab3ef2d1-393a-44e7-a113-37ff8a2da607", "settlement_id": "287370f3-b2b6-48d6-b684-94c440f3254a", "amount": 130000.0, "sender": "sara", "sender_new_balance": 718400.0, "tx_hash": "0xb4c4c9d6799a2c5d9a61bf184cd8e2662fdf2935a6a96fb74eacbedc377b1acc", "four_eyes": true}','127.0.0.1','2026-04-30 07:05:09');
INSERT INTO audit_log VALUES(165,'settlement','sara','{"settlement_id": "1a4b37ca-a89b-4c6c-ad5d-1e892eaf2e5d", "risk_score": 15.28, "risk_decision": "approved", "risk_reasons": ["High graph centrality (67.5)"], "risk_breakdown": {"rules": 0, "ml": 12.88, "nlp": 0, "graph": 67.53}, "shap_values": {"amount": -1.4071, "hour": 0.0417, "day_of_week": -0.0392, "tx_frequency_7d": -1.2532, "is_round_amount": 0.0459, "country_risk_score": -2.4442, "sender_id": -1.7933, "receiver_id": -0.3703, "velocity_1h": -0.052, "velocity_24h": -0.243, "velocity_7d": -0.1673, "avg_tx_amount": -0.0703, "std_tx_amount": 0.2021, "amount_zscore": 0.1235, "unique_receivers_7d": -0.0897, "is_new_receiver": 0.0137}, "status": "settled", "tx_hash": "0x0233efef794aea10eaee6642ed19c48b145f934f4040faf763d4a6dada8874d6", "blockchain": {"tx_hash": "0x0233efef794aea10eaee6642ed19c48b145f934f4040faf763d4a6dada8874d6", "block_number": 376, "gas_used": 32101, "status": "failed"}, "settlement_time_ms": 235, "uetr": "18c322bc-8d3d-4a84-87a5-fd6760aedaf7", "new_balance": 718300.0}','127.0.0.1','2026-04-30 07:18:02');
INSERT INTO audit_log VALUES(166,'settlement','sara','{"settlement_id": "3586d6de-17d3-468b-8f6c-94c12a406128", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Watchlist match: arms dealer international", "High graph centrality (75.7)"], "risk_breakdown": {"rules": 0, "ml": 14.42, "nlp": 100, "graph": 75.74}, "shap_values": {"amount": -3.0422, "hour": 0.0892, "day_of_week": -0.0271, "tx_frequency_7d": 0.1257, "is_round_amount": -0.0178, "country_risk_score": -0.9084, "sender_id": -0.1707, "receiver_id": -0.4736, "velocity_1h": -0.1387, "velocity_24h": -0.3833, "velocity_7d": -0.3333, "avg_tx_amount": -0.1899, "std_tx_amount": 0.109, "amount_zscore": 0.1689, "unique_receivers_7d": -0.0632, "is_new_receiver": 0.0167}, "status": "blocked", "hitl_id": "6f16d2e0-b3b9-4034-abea-71732d2811a5", "case_number": "CASE-2026-0011", "new_balance": 718200.0, "message": "Transaction blocked. Compliance case CASE-2026-0011 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:18:14');
INSERT INTO audit_log VALUES(167,'case_updated','mohamad','{"case_id": "89b15a1c-7271-4f46-8373-a307df1bcd18", "updates": {"status": "investigating"}}','127.0.0.1','2026-04-30 07:18:30');
INSERT INTO audit_log VALUES(168,'case_escalated','mohamad','{"case_id": "89b15a1c-7271-4f46-8373-a307df1bcd18"}','127.0.0.1','2026-04-30 07:18:35');
INSERT INTO audit_log VALUES(169,'case_note_added','mohamad','{"case_id": "89b15a1c-7271-4f46-8373-a307df1bcd18"}','127.0.0.1','2026-04-30 07:18:51');
INSERT INTO audit_log VALUES(170,'case_updated','mohamad','{"case_id": "89b15a1c-7271-4f46-8373-a307df1bcd18", "updates": {"status": "resolved", "assigned_to": "Mohamad", "resolution": "Verified"}}','127.0.0.1','2026-04-30 07:19:05');
INSERT INTO audit_log VALUES(171,'hitl_approve','mohamad','{"hitl_id": "6f16d2e0-b3b9-4034-abea-71732d2811a5", "settlement_id": "3586d6de-17d3-468b-8f6c-94c12a406128", "amount": 100.0, "sender": "sara", "sender_new_balance": 718200.0, "tx_hash": "0x8bd29981100ffc04a34fc6b356d80a1669f34a0eca08c50c9e69913ebf74010a", "four_eyes": false}','127.0.0.1','2026-04-30 07:19:10');
INSERT INTO audit_log VALUES(172,'settlement','sara','{"settlement_id": "a66a171a-d83d-4f7d-9ae0-f216cf513a59", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Suspicious round amount", "Watchlist match: dark web exchange", "High graph centrality (65.3)"], "risk_breakdown": {"rules": 20, "ml": 49.72, "nlp": 100, "graph": 65.31}, "shap_values": {"amount": -0.1688, "hour": 0.1276, "day_of_week": -0.0195, "tx_frequency_7d": -0.5856, "is_round_amount": -0.0131, "country_risk_score": 1.4938, "sender_id": -0.1983, "receiver_id": 0.0829, "velocity_1h": -0.1048, "velocity_24h": -0.3673, "velocity_7d": -0.4786, "avg_tx_amount": -0.1667, "std_tx_amount": 0.2855, "amount_zscore": 0.1496, "unique_receivers_7d": -0.0565, "is_new_receiver": 0.0297}, "status": "blocked", "hitl_id": "a1d9b87c-89b2-4e56-9983-6f5eb39f994a", "case_number": "CASE-2026-0012", "new_balance": 706200.0, "message": "Transaction blocked. Compliance case CASE-2026-0012 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:20:02');
INSERT INTO audit_log VALUES(173,'case_updated','mohamad','{"case_id": "5128ed03-a809-4b60-abd6-06a89d659d89", "updates": {"status": "resolved", "assigned_to": "Sriram", "resolution": "resolved"}}','127.0.0.1','2026-04-30 07:20:18');
INSERT INTO audit_log VALUES(174,'hitl_approve','mohamad','{"hitl_id": "a1d9b87c-89b2-4e56-9983-6f5eb39f994a", "settlement_id": "a66a171a-d83d-4f7d-9ae0-f216cf513a59", "amount": 12000.0, "sender": "sara", "sender_new_balance": 706200.0, "tx_hash": "0x572ec56d1159bf8dfe77d392ff0c46a06c7fd84c5d9a26ef58b2158a482242c7", "four_eyes": false}','127.0.0.1','2026-04-30 07:20:22');
INSERT INTO audit_log VALUES(175,'settlement','sara','{"settlement_id": "7ec89294-b0ab-48f7-8cfc-b574435b2cf1", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["AML threshold breach: >$120,000 exceeds $100K reporting limit", "Suspicious round amount", "Watchlist match: dark web exchange", "High graph centrality (80.8)"], "risk_breakdown": {"rules": 70, "ml": 25.26, "nlp": 100, "graph": 80.8}, "shap_values": {"amount": -0.0905, "hour": 0.1236, "day_of_week": 0.0011, "tx_frequency_7d": -0.2424, "is_round_amount": 0.0451, "country_risk_score": -4.3129, "sender_id": -0.0823, "receiver_id": -0.3915, "velocity_1h": -0.0439, "velocity_24h": -0.4486, "velocity_7d": -0.2518, "avg_tx_amount": -0.0388, "std_tx_amount": 0.2359, "amount_zscore": 0.0946, "unique_receivers_7d": -0.1154, "is_new_receiver": 0.0145}, "status": "blocked", "hitl_id": "18c45fa0-3ff6-4f7e-9946-040d0b5ba5b6", "case_number": "CASE-2026-0013", "new_balance": 586200.0, "message": "Transaction blocked. Compliance case CASE-2026-0013 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:21:18');
INSERT INTO audit_log VALUES(176,'case_updated','mohamad','{"case_id": "b28f7306-45aa-45b5-bf6a-0e81c3e8ce6e", "updates": {"status": "resolved", "assigned_to": "Rohit", "resolution": "resolve"}}','127.0.0.1','2026-04-30 07:21:30');
INSERT INTO audit_log VALUES(177,'four_eyes_first_approval','mohamad','{"hitl_id": "18c45fa0-3ff6-4f7e-9946-040d0b5ba5b6", "amount": 120000.0}','127.0.0.1','2026-04-30 07:21:33');
INSERT INTO audit_log VALUES(178,'hitl_approve','rohit','{"hitl_id": "18c45fa0-3ff6-4f7e-9946-040d0b5ba5b6", "settlement_id": "7ec89294-b0ab-48f7-8cfc-b574435b2cf1", "amount": 120000.0, "sender": "sara", "sender_new_balance": 586200.0, "tx_hash": "0x466be51fc159f6f0ee9c0469eeb57a62644a0a636cc36c08a460f14c7b23ec9c", "four_eyes": true}','127.0.0.1','2026-04-30 07:21:42');
INSERT INTO audit_log VALUES(179,'login_success','mohamad','{"role": "admin"}','127.0.0.1','2026-04-30 07:22:28');
INSERT INTO audit_log VALUES(180,'settlement','sara','{"settlement_id": "2bcf6047-6616-4afd-82f7-fa846f0dfafe", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["High-risk jurisdiction (risk=0.86)", "Watchlist match: shell company alpha", "High graph centrality (68.4)"], "risk_breakdown": {"rules": 25, "ml": 25.0, "nlp": 100, "graph": 68.43}, "shap_values": {"amount": -3.3019, "hour": 0.0875, "day_of_week": -0.0157, "tx_frequency_7d": -0.0837, "is_round_amount": -0.0264, "country_risk_score": 1.7566, "sender_id": -0.2267, "receiver_id": -0.3042, "velocity_1h": -0.2142, "velocity_24h": -0.3073, "velocity_7d": -0.2248, "avg_tx_amount": -0.0967, "std_tx_amount": 0.3386, "amount_zscore": 0.1037, "unique_receivers_7d": -0.0352, "is_new_receiver": 0.016}, "status": "blocked", "hitl_id": "2a4e6fa9-7390-4e77-ba5a-e0a29bb6ba1c", "case_number": "CASE-2026-0014", "new_balance": 586100.0, "message": "Transaction blocked. Compliance case CASE-2026-0014 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:26:39');
INSERT INTO audit_log VALUES(181,'case_updated','mohamad','{"case_id": "1623cd78-2446-45ab-9b37-ca5788f25b87", "updates": {"status": "resolved", "assigned_to": "Mohamad", "resolution": "test"}}','127.0.0.1','2026-04-30 07:27:01');
INSERT INTO audit_log VALUES(182,'hitl_approve','mohamad','{"hitl_id": "2a4e6fa9-7390-4e77-ba5a-e0a29bb6ba1c", "settlement_id": "2bcf6047-6616-4afd-82f7-fa846f0dfafe", "amount": 100.0, "sender": "sara", "sender_new_balance": 586100.0, "tx_hash": "0xda6e43d3af8219fbecbc0e8a2d3b0a2582578dfef3d53239c42d65303a72a9c1", "four_eyes": false}','127.0.0.1','2026-04-30 07:27:21');
INSERT INTO audit_log VALUES(183,'settlement','sara','{"settlement_id": "cdd48e17-d8ee-4e5c-8cc4-9493696e62f4", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["AML threshold breach: >$100,001 exceeds $100K reporting limit", "Suspicious round amount", "Watchlist match: shell company alpha", "High graph centrality (87.4)"], "risk_breakdown": {"rules": 70, "ml": 33.27, "nlp": 100, "graph": 87.4}, "shap_values": {"amount": -0.2167, "hour": 0.1788, "day_of_week": -0.0077, "tx_frequency_7d": 0.0475, "is_round_amount": 0.0358, "country_risk_score": -0.9172, "sender_id": 0.2956, "receiver_id": -0.5439, "velocity_1h": -0.0475, "velocity_24h": -0.6038, "velocity_7d": -0.4478, "avg_tx_amount": -0.2886, "std_tx_amount": 0.0874, "amount_zscore": 0.1441, "unique_receivers_7d": -0.1369, "is_new_receiver": 0.0166}, "status": "blocked", "hitl_id": "25f086d2-6f03-4761-9126-6d8101bd3c7d", "case_number": "CASE-2026-0015", "new_balance": 486099.0, "message": "Transaction blocked. Compliance case CASE-2026-0015 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:27:50');
INSERT INTO audit_log VALUES(184,'case_updated','mohamad','{"case_id": "5ac7f871-7abd-4d03-8ec1-9cfb19990272", "updates": {"status": "resolved", "assigned_to": "Walid", "resolution": "test"}}','127.0.0.1','2026-04-30 07:28:07');
INSERT INTO audit_log VALUES(185,'four_eyes_first_approval','mohamad','{"hitl_id": "25f086d2-6f03-4761-9126-6d8101bd3c7d", "amount": 100001.0}','127.0.0.1','2026-04-30 07:28:10');
INSERT INTO audit_log VALUES(186,'hitl_approve','rohit','{"hitl_id": "25f086d2-6f03-4761-9126-6d8101bd3c7d", "settlement_id": "cdd48e17-d8ee-4e5c-8cc4-9493696e62f4", "amount": 100001.0, "sender": "sara", "sender_new_balance": 486099.0, "tx_hash": "0xa614a49298bfa76941ab7692d540d3fc4ee4048694af5e165ff78340ca5ffa23", "four_eyes": true}','127.0.0.1','2026-04-30 07:28:25');
INSERT INTO audit_log VALUES(187,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:33:27');
INSERT INTO audit_log VALUES(188,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:33:35');
INSERT INTO audit_log VALUES(189,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:33:51');
INSERT INTO audit_log VALUES(190,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:34:18');
INSERT INTO audit_log VALUES(191,'settlement','sara','{"settlement_id": "8ee25f20-4e1c-4df2-babd-5e8ac4aa83dd", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Suspicious round amount", "High-risk jurisdiction (risk=0.70)", "ML ensemble alert (score=65.8)", "Watchlist match: shell company alpha", "High graph centrality (78.0)"], "risk_breakdown": {"rules": 45, "ml": 65.82, "nlp": 100, "graph": 77.98}, "shap_values": {"amount": 0.0399, "hour": 0.163, "day_of_week": -0.0152, "tx_frequency_7d": 0.2097, "is_round_amount": 0.0387, "country_risk_score": 2.2237, "sender_id": -0.2875, "receiver_id": -0.4568, "velocity_1h": -0.013, "velocity_24h": -0.3922, "velocity_7d": -0.3806, "avg_tx_amount": -0.0977, "std_tx_amount": 0.2856, "amount_zscore": 0.1466, "unique_receivers_7d": -0.0273, "is_new_receiver": 0.0298}, "status": "blocked", "hitl_id": "8589682d-0b72-485c-8ca9-18b15e307763", "case_number": "CASE-2026-0016", "new_balance": 471099.0, "message": "Transaction blocked. Compliance case CASE-2026-0016 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:34:18');
INSERT INTO audit_log VALUES(192,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 07:34:31');
INSERT INTO audit_log VALUES(193,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 07:34:33');
INSERT INTO audit_log VALUES(194,'login_failed','sara','{"reason": "invalid credentials"}','127.0.0.1','2026-04-30 07:34:34');
INSERT INTO audit_log VALUES(195,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:34:42');
INSERT INTO audit_log VALUES(196,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:36:24');
INSERT INTO audit_log VALUES(197,'settlement','sara','{"settlement_id": "8718a040-c2ba-4884-9ec7-0a6930ace09e", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Suspicious round amount", "Watchlist match: shell company alpha", "High graph centrality (61.4)"], "risk_breakdown": {"rules": 20, "ml": 15.99, "nlp": 100, "graph": 61.41}, "shap_values": {"amount": -0.0775, "hour": 0.0844, "day_of_week": -0.0096, "tx_frequency_7d": 0.0595, "is_round_amount": 0.0307, "country_risk_score": -3.5017, "sender_id": -2.4839, "receiver_id": -0.4516, "velocity_1h": 0.007, "velocity_24h": -0.3011, "velocity_7d": -0.2594, "avg_tx_amount": -0.0478, "std_tx_amount": 0.1705, "amount_zscore": 0.1131, "unique_receivers_7d": -0.0953, "is_new_receiver": 0.0277}, "status": "blocked", "hitl_id": "0d384658-7914-4e09-a737-7e778a0faad2", "case_number": "CASE-2026-0017", "new_balance": 458754.0, "message": "Transaction blocked. Compliance case CASE-2026-0017 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:36:24');
INSERT INTO audit_log VALUES(198,'login_success','sara','{"role": "client"}','127.0.0.1','2026-04-30 07:38:15');
INSERT INTO audit_log VALUES(199,'settlement','sara','{"settlement_id": "bed38ecf-008b-4d98-8c1e-6352e115d6f3", "risk_score": 95, "risk_decision": "blocked", "risk_reasons": ["Structuring/smurfing pattern ($9K-$9.9K)", "High-risk jurisdiction (risk=0.78)", "Watchlist match: shell company alpha", "High graph centrality (84.4)"], "risk_breakdown": {"rules": 85, "ml": 19.99, "nlp": 100, "graph": 84.36}, "shap_values": {"amount": -0.1992, "hour": 0.0581, "day_of_week": -0.0128, "tx_frequency_7d": -2.4674, "is_round_amount": 0.0406, "country_risk_score": 1.6579, "sender_id": -3.3648, "receiver_id": 0.3313, "velocity_1h": -0.1537, "velocity_24h": -0.1915, "velocity_7d": -0.3249, "avg_tx_amount": -0.1174, "std_tx_amount": 0.1815, "amount_zscore": 0.0896, "unique_receivers_7d": -0.1744, "is_new_receiver": 0.0273}, "status": "blocked", "hitl_id": "93e3a8e3-6d0e-41bb-b0dd-1e4439a6feb5", "case_number": "CASE-2026-0018", "new_balance": 448755.0, "message": "Transaction blocked. Compliance case CASE-2026-0018 created. Added to HITL review queue."}','127.0.0.1','2026-04-30 07:38:15');
INSERT INTO audit_log VALUES(200,'case_updated','mohamad','{"case_id": "a7768f41-02e4-4109-b6b0-77cf59e27363", "updates": {"status": "resolved", "assigned_to": "Rohit", "resolution": "test"}}','127.0.0.1','2026-04-30 07:47:32');
INSERT INTO audit_log VALUES(201,'hitl_approve','mohamad','{"hitl_id": "8589682d-0b72-485c-8ca9-18b15e307763", "settlement_id": "8ee25f20-4e1c-4df2-babd-5e8ac4aa83dd", "amount": 15000.0, "sender": "sara", "sender_new_balance": 448755.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-30 07:47:36');
INSERT INTO audit_log VALUES(202,'case_updated','mohamad','{"case_id": "68d30d57-3482-42ba-b21c-bfcd2f5281bd", "updates": {"assigned_to": "Rohit"}}','127.0.0.1','2026-04-30 07:47:48');
INSERT INTO audit_log VALUES(203,'case_updated','mohamad','{"case_id": "68d30d57-3482-42ba-b21c-bfcd2f5281bd", "updates": {"status": "resolved", "assigned_to": "Walid", "resolution": "test"}}','127.0.0.1','2026-04-30 07:47:56');
INSERT INTO audit_log VALUES(204,'case_updated','mohamad','{"case_id": "417fe7b4-fec9-41ca-a247-05a5832f9406", "updates": {"status": "resolved", "assigned_to": "Rohit", "resolution": "test"}}','127.0.0.1','2026-04-30 07:48:04');
INSERT INTO audit_log VALUES(205,'hitl_approve','mohamad','{"hitl_id": "0d384658-7914-4e09-a737-7e778a0faad2", "settlement_id": "8718a040-c2ba-4884-9ec7-0a6930ace09e", "amount": 12345.0, "sender": "sara", "sender_new_balance": 448755.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-30 07:48:08');
INSERT INTO audit_log VALUES(206,'hitl_approve','mohamad','{"hitl_id": "93e3a8e3-6d0e-41bb-b0dd-1e4439a6feb5", "settlement_id": "bed38ecf-008b-4d98-8c1e-6352e115d6f3", "amount": 9999.0, "sender": "sara", "sender_new_balance": 448755.0, "tx_hash": "N/A", "four_eyes": false}','127.0.0.1','2026-04-30 07:48:13');
CREATE TABLE sanctions_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT UNIQUE,
        entity_type TEXT DEFAULT 'individual',
        added_by TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE swift_gpi_tracker (
        uetr TEXT PRIMARY KEY,
        settlement_id TEXT,
        status TEXT DEFAULT 'ACSP',
        originator TEXT,
        beneficiary TEXT,
        amount REAL,
        currency TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO swift_gpi_tracker VALUES('95400535-9d13-4398-a86e-d2274f04f435','11fe31cd-6896-4a8d-934a-f58d019d1033','ACCC','Mohamad Idriss','Walid Elmahdy',50000.0,'USD','2026-04-11 12:42:12','2026-04-11 12:42:12');
INSERT INTO swift_gpi_tracker VALUES('bd98a666-a117-40c0-a331-cf7bb8f82a8d','c34bc1a4-7de5-46b5-8a48-a9b2df5118ea','ACCC','Mohamad Idriss','Sriram Acharya Mudumbai',50000.0,'USD','2026-04-11 12:50:41','2026-04-11 12:50:41');
INSERT INTO swift_gpi_tracker VALUES('ad8abb39-1eb3-4421-b5c1-f5754a2ce130','bfc2966e-1d25-474e-b65f-a5a92b6e1f56','ACCC','Mohamad Idriss','Global Trade Corp',50000.0,'USD','2026-04-11 12:50:45','2026-04-11 12:50:45');
INSERT INTO swift_gpi_tracker VALUES('e171222b-301c-4035-9f33-7554e4b58d9d','2f483b6b-c384-4813-9bdd-c5ab0b49f845','ACCC','Mohamad Idriss','Acme International',50000.0,'USD','2026-04-11 12:50:54','2026-04-11 12:50:54');
INSERT INTO swift_gpi_tracker VALUES('19199f42-bd3e-4be8-a285-c2fbc1e2b9ff','9dc830dc-df71-42ca-82d4-c4caa3d20c38','ACCC','Mohamad Idriss','Walid Elmahdy',50000.0,'USD','2026-04-19 13:05:40','2026-04-19 13:05:40');
INSERT INTO swift_gpi_tracker VALUES('3caf9cc9-c6bd-4096-bb69-f9ed63f6738c','68782f68-cce2-4c12-a50f-181a367510a9','ACCC','Sara Mitchell','Mohamad Idriss',100.0,'USD','2026-04-28 21:06:13','2026-04-28 21:06:13');
INSERT INTO swift_gpi_tracker VALUES('f218fcd3-7dc4-4f90-b40a-245efc47c03c','6cf0dc36-1b5f-4392-bbf7-0581ce7b405f','ACCC','Sara Mitchell','John Smith',100.0,'USD','2026-04-30 06:47:15','2026-04-30 06:47:15');
INSERT INTO swift_gpi_tracker VALUES('f64bb252-e8d0-495f-b39e-bd23540b8240','ac9e37e7-b23e-486c-8386-9d883b50a58a','ACCC','Sara Mitchell','Mohamad k. Idriss',100.0,'USD','2026-04-30 06:51:11','2026-04-30 06:51:11');
INSERT INTO swift_gpi_tracker VALUES('41ad43e5-7365-4cca-851a-99f787875357','8ea10b86-bde0-4754-a235-4fdbefff6785','ACCC','Sara Mitchell','John Smith',50.0,'USD','2026-04-30 06:53:26','2026-04-30 06:53:26');
INSERT INTO swift_gpi_tracker VALUES('0d6ab686-dd50-45b7-bc2d-a31a8fd5cf4d','718834be-5be3-444e-802c-b3cd18823ba3','ACCC','Sara Mitchell','Ahmad Al-Mansoori',50.0,'USD','2026-04-30 06:59:32','2026-04-30 06:59:32');
INSERT INTO swift_gpi_tracker VALUES('18c322bc-8d3d-4a84-87a5-fd6760aedaf7','1a4b37ca-a89b-4c6c-ad5d-1e892eaf2e5d','ACCC','Sara Mitchell','Acme International',100.0,'USD','2026-04-30 07:18:02','2026-04-30 07:18:02');
CREATE TABLE user_accounts (
        username TEXT PRIMARY KEY,
        full_name TEXT,
        balance REAL,
        currency TEXT DEFAULT 'USD',
        wallet_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    , locked INTEGER DEFAULT 0);
INSERT INTO user_accounts VALUES('mohamad','Mohamad Idriss',492100.0,'USD','0x4cFa5D43011228909870809Fc34905632BC1167B','2026-04-11 12:33:40','2026-04-28T21:06:13.360320',0);
INSERT INTO user_accounts VALUES('rohit','Rohit Jacob Isaac',750000.0,'USD','0x566f152d73cf6996Da5D252A5477d126a3DC03c1','2026-04-11 12:33:40','2026-04-11 12:33:40',0);
INSERT INTO user_accounts VALUES('sriram','Sriram Acharya Mudumbai',550000.0,'USD','0xEEA27F3D93DE547388670a3F00DAa72828fdFFd9','2026-04-11 12:33:40','2026-04-11T12:50:41.583559',0);
INSERT INTO user_accounts VALUES('walid','Walid Elmahdy',450000.0,'USD','0x999942c3Fbe47a6F7995b7C4D4A090A033B909ED','2026-04-11 12:33:40','2026-04-19T13:05:40.946621',0);
INSERT INTO user_accounts VALUES('vibin','Vibin Chandrabose',150000.0,'USD','0xb11f7e09AFEE8380CEEAC16442a8a48a651d2912','2026-04-11 12:33:40','2026-04-11 12:33:40',0);
INSERT INTO user_accounts VALUES('sara','Sara Mitchell',448755.0,'USD','0xbC2FEE4D73316145F37325DB13e0b446632aD8d0','2026-04-28 20:40:48','2026-04-30T07:38:15.975757',0);
INSERT INTO user_accounts VALUES('lena','Lena Novak',125000.0,'USD','0xDec87F3397B6bB81bAF4E4b64c1242Bf6978eC9a','2026-04-28 20:40:48','2026-04-28 20:40:48',0);
INSERT INTO user_accounts VALUES('james','James Okafor',88000.0,'USD','0x5aDE48F11C9d699912F5494BE6F7727eD2ABcFDA','2026-04-28 20:40:48','2026-04-28T20:44:53.489879',0);
INSERT INTO user_accounts VALUES('mei','Mei Lin',310000.0,'USD','0xf6D5dF7D18916907B3f23301298Aa8EC447B73C2','2026-04-28 20:40:48','2026-04-28 20:40:48',0);
INSERT INTO user_accounts VALUES('carlos','Carlos Mendez',450000.0,'USD','0x18a54D67f4A7cf96406c0b0736d3224f6e3400C4','2026-04-28 20:40:48','2026-04-28 20:40:48',0);
INSERT INTO user_accounts VALUES('aisha','Aisha Al-Rashid',2750000.0,'USD','','2026-04-29 21:13:46','2026-04-29 21:13:46',0);
INSERT INTO user_accounts VALUES('henrik','Henrik Svensson',4850000.0,'USD','','2026-04-29 21:13:46','2026-04-29 21:13:46',0);
INSERT INTO user_accounts VALUES('priya','Priya Nair',560000.0,'USD','','2026-04-29 21:13:46','2026-04-29 21:13:46',0);
CREATE TABLE compliance_cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE,
        settlement_id TEXT,
        case_type TEXT,
        severity TEXT,
        status TEXT DEFAULT 'open',
        assigned_to TEXT,
        description TEXT,
        risk_score REAL,
        amount REAL,
        sender_name TEXT,
        beneficiary_name TEXT,
        findings TEXT,
        resolution TEXT,
        regulatory_report_filed INTEGER DEFAULT 0,
        sar_number TEXT,
        sla_deadline TIMESTAMP,
        escalation_level INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
    );
INSERT INTO compliance_cases VALUES('4b08ec30-09aa-4de1-9ee8-27755c446feb','CASE-2026-0001','03e1ccd4-e0b4-4102-90c8-539f0e83fce6','sanctions','critical','resolved','Walid','Auto-generated case for blocked transaction. Amount: $50,000.00. Reasons: Suspicious round amount; Watchlist match: arms dealer international',95.0,50000.0,'Mohamad Idriss','Arms Dealer International',NULL,'resolved',0,NULL,'2026-04-12T12:50:49.541884',0,'2026-04-11 12:50:49','2026-04-29T08:14:52.169720','2026-04-29T08:14:52.169668');
INSERT INTO compliance_cases VALUES('4eb7ac94-1606-448f-bd5b-0af7393b40c1','CASE-2026-0002','67fe364b-1756-4b8b-a28c-da42a11db791','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $100.00. Reasons: Watchlist match: shell company alpha; High graph centrality (70.8)',95.0,100.0,'Sara Mitchell','Shell Company Alpha',NULL,NULL,0,NULL,'2026-05-01T06:37:19.862029',0,'2026-04-30 06:37:19','2026-04-30 06:37:19',NULL);
INSERT INTO compliance_cases VALUES('2a5f01f0-7364-47ad-8e38-fdfd0731dfcf','CASE-2026-0003','07b9ed5c-e3e9-4a9e-b71b-e25877806263','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $100.00. Reasons: High-risk jurisdiction (risk=0.91); Watchlist match: offshore haven corp; High graph centrality (75.6)',95.0,100.0,'Sara Mitchell','Offshore Haven Corp',NULL,NULL,0,NULL,'2026-05-01T06:40:18.353967',0,'2026-04-30 06:40:18','2026-04-30 06:40:18',NULL);
INSERT INTO compliance_cases VALUES('6e4715c2-af5f-45b1-93f4-1bf2f82e32e2','CASE-2026-0004','e1266713-bdd0-4cbc-a441-90476aaf95c4','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $100.00. Reasons: Watchlist match: hawala underground; High graph centrality (50.5)',95.0,100.0,'Sara Mitchell','Hawala Underground Services',NULL,NULL,0,NULL,'2026-05-01T06:45:51.784785',0,'2026-04-30 06:45:51','2026-04-30 06:45:51',NULL);
INSERT INTO compliance_cases VALUES('a25f833f-a613-47a4-880e-d112e185e0cf','CASE-2026-0005','72970472-a8b6-4007-b0a0-2b6485985fb6','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $100.00. Reasons: Watchlist match: shell company alpha; High graph centrality (57.2)',95.0,100.0,'Sara Mitchell','Shell Company Alpha',NULL,NULL,0,NULL,'2026-05-01T06:47:29.881312',0,'2026-04-30 06:47:29','2026-04-30 06:47:29',NULL);
INSERT INTO compliance_cases VALUES('abcb0da1-0fdc-4900-bc1b-d37d808b3e7b','CASE-2026-0006','46b03514-4b0e-4f65-a13d-d2ad7afe60d0','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $50.00. Reasons: High-risk jurisdiction (risk=0.97); Watchlist match: shell company alpha; High graph centrality (70.1)',95.0,50.0,'Sara Mitchell','Shell Company Alpha',NULL,NULL,0,NULL,'2026-05-01T06:51:25.698886',0,'2026-04-30 06:51:25','2026-04-30 06:51:25',NULL);
INSERT INTO compliance_cases VALUES('4a0c114b-21e9-4d17-8803-abfcc6677e8b','CASE-2026-0007','6be9d1ad-8efb-4247-8ff2-8960158291a5','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $50.00. Reasons: Watchlist match: dark web exchange; High graph centrality (60.3)',95.0,50.0,'Sara Mitchell','Dark Web Exchange',NULL,NULL,0,NULL,'2026-05-01T06:53:38.770285',0,'2026-04-30 06:53:38','2026-04-30 06:53:38',NULL);
INSERT INTO compliance_cases VALUES('62696e9a-c144-4445-8576-695f02e3218f','CASE-2026-0008','a17bd722-093d-4b70-8f53-eaaf187b14dd','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $50.00. Reasons: Watchlist match: narco laundry inc; High graph centrality (73.4)',95.0,50.0,'Sara Mitchell','Narco Laundry Inc',NULL,NULL,0,NULL,'2026-05-01T07:00:01.606948',0,'2026-04-30 07:00:01','2026-04-30 07:00:01',NULL);
INSERT INTO compliance_cases VALUES('6557ca08-aef9-4d88-a798-da4133def2f6','CASE-2026-0009','e6be7fcf-621e-4de0-b455-2ff4f490ad69','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $50.00. Reasons: Watchlist match: narco laundry inc; High graph centrality (69.1)',95.0,50.0,'Sara Mitchell','Narco Laundry Inc',NULL,NULL,0,NULL,'2026-05-01T07:01:23.931144',0,'2026-04-30 07:01:23','2026-04-30 07:01:23',NULL);
INSERT INTO compliance_cases VALUES('140fa3bb-d070-4484-a914-a6b8cd8b8e58','CASE-2026-0010','287370f3-b2b6-48d6-b684-94c440f3254a','sanctions','critical','open',NULL,'Auto-generated case for blocked transaction. Amount: $130,000.00. Reasons: AML threshold breach: >$130,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: phantom bank; High graph centrality (79.4)',95.0,130000.0,'Sara Mitchell','Phantom Bank Ltd',NULL,NULL,0,NULL,'2026-05-01T07:03:40.236371',0,'2026-04-30 07:03:40','2026-04-30 07:03:40',NULL);
INSERT INTO compliance_cases VALUES('89b15a1c-7271-4f46-8373-a307df1bcd18','CASE-2026-0011','3586d6de-17d3-468b-8f6c-94c12a406128','sanctions','critical','resolved','Mohamad','Auto-generated case for blocked transaction. Amount: $100.00. Reasons: Watchlist match: arms dealer international; High graph centrality (75.7)',95.0,100.0,'Sara Mitchell','Arms Dealer International',NULL,'Verified',0,NULL,'2026-05-01T07:18:14.703491',0,'2026-04-30 07:18:14','2026-04-30T07:19:05.565708','2026-04-30T07:19:05.565690');
INSERT INTO compliance_cases VALUES('5128ed03-a809-4b60-abd6-06a89d659d89','CASE-2026-0012','a66a171a-d83d-4f7d-9ae0-f216cf513a59','sanctions','critical','resolved','Sriram','Auto-generated case for blocked transaction. Amount: $12,000.00. Reasons: Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (65.3)',95.0,12000.0,'Sara Mitchell','Dark Web Exchange',NULL,'resolved',0,NULL,'2026-05-01T07:20:02.618474',0,'2026-04-30 07:20:02','2026-04-30T07:20:18.345301','2026-04-30T07:20:18.345235');
INSERT INTO compliance_cases VALUES('b28f7306-45aa-45b5-bf6a-0e81c3e8ce6e','CASE-2026-0013','7ec89294-b0ab-48f7-8cfc-b574435b2cf1','sanctions','critical','resolved','Rohit','Auto-generated case for blocked transaction. Amount: $120,000.00. Reasons: AML threshold breach: >$120,000 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: dark web exchange; High graph centrality (80.8)',95.0,120000.0,'Sara Mitchell','Dark Web Exchange',NULL,'resolve',0,NULL,'2026-05-01T07:21:18.542557',0,'2026-04-30 07:21:18','2026-04-30T07:21:30.884526','2026-04-30T07:21:30.884493');
INSERT INTO compliance_cases VALUES('1623cd78-2446-45ab-9b37-ca5788f25b87','CASE-2026-0014','2bcf6047-6616-4afd-82f7-fa846f0dfafe','sanctions','critical','resolved','Mohamad','Auto-generated case for blocked transaction. Amount: $100.00. Reasons: High-risk jurisdiction (risk=0.86); Watchlist match: shell company alpha; High graph centrality (68.4)',95.0,100.0,'Sara Mitchell','Shell Company Alpha',NULL,'test',0,NULL,'2026-05-01T07:26:39.840395',0,'2026-04-30 07:26:39','2026-04-30T07:27:01.693757','2026-04-30T07:27:01.693721');
INSERT INTO compliance_cases VALUES('5ac7f871-7abd-4d03-8ec1-9cfb19990272','CASE-2026-0015','cdd48e17-d8ee-4e5c-8cc4-9493696e62f4','sanctions','critical','resolved','Walid','Auto-generated case for blocked transaction. Amount: $100,001.00. Reasons: AML threshold breach: >$100,001 exceeds $100K reporting limit; Suspicious round amount; Watchlist match: shell company alpha; High graph centrality (87.4)',95.0,100001.0,'Sara Mitchell','Shell Company Alpha',NULL,'test',0,NULL,'2026-05-01T07:27:50.873966',0,'2026-04-30 07:27:50','2026-04-30T07:28:07.007778','2026-04-30T07:28:07.007752');
INSERT INTO compliance_cases VALUES('a7768f41-02e4-4109-b6b0-77cf59e27363','CASE-2026-0016','8ee25f20-4e1c-4df2-babd-5e8ac4aa83dd','sanctions','critical','resolved','Rohit','Auto-generated case for blocked transaction. Amount: $15,000.00. Reasons: Suspicious round amount; High-risk jurisdiction (risk=0.70); ML ensemble alert (score=65.8); Watchlist match: shell company alpha; High graph centrality (78.0)',95.0,15000.0,'Sara Mitchell','Shell Company Alpha',NULL,'test',0,NULL,'2026-05-01T07:34:18.580633',0,'2026-04-30 07:34:18','2026-04-30T07:47:32.928963','2026-04-30T07:47:32.928913');
INSERT INTO compliance_cases VALUES('68d30d57-3482-42ba-b21c-bfcd2f5281bd','CASE-2026-0017','8718a040-c2ba-4884-9ec7-0a6930ace09e','sanctions','critical','resolved','Walid','Auto-generated case for blocked transaction. Amount: $12,345.00. Reasons: Suspicious round amount; Watchlist match: shell company alpha; High graph centrality (61.4)',95.0,12345.0,'Sara Mitchell','Shell Company Alpha',NULL,'test',0,NULL,'2026-05-01T07:36:24.831268',0,'2026-04-30 07:36:24','2026-04-30T07:47:56.557239','2026-04-30T07:47:56.557232');
INSERT INTO compliance_cases VALUES('417fe7b4-fec9-41ca-a247-05a5832f9406','CASE-2026-0018','bed38ecf-008b-4d98-8c1e-6352e115d6f3','sanctions','critical','resolved','Rohit','Auto-generated case for blocked transaction. Amount: $9,999.00. Reasons: Structuring/smurfing pattern ($9K-$9.9K); High-risk jurisdiction (risk=0.78); Watchlist match: shell company alpha; High graph centrality (84.4)',95.0,9999.0,'Sara Mitchell','Shell Company Alpha',NULL,'test',0,NULL,'2026-05-01T07:38:15.978174',0,'2026-04-30 07:38:15','2026-04-30T07:48:04.390238','2026-04-30T07:48:04.390223');
CREATE TABLE four_eyes_approvals (
        id TEXT PRIMARY KEY,
        hitl_id TEXT,
        first_approver TEXT,
        first_approved_at TIMESTAMP,
        second_approver TEXT,
        second_approved_at TIMESTAMP,
        required INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending'
    , first_notes TEXT, second_notes TEXT);
INSERT INTO four_eyes_approvals VALUES('19d52a2b-3e21-4927-b1b5-d2363793f60f','ddcb5523-f065-4d17-9525-e5e1077f47a0','mohamad','2026-04-19T13:24:31.028601','rohit','2026-04-19T13:24:31.072307',2,'completed',NULL,NULL);
INSERT INTO four_eyes_approvals VALUES('8c42f96a-06b4-464f-a061-7791cced69e3','dfce6a1c-1ddc-4366-b892-ad3f9fbe632f','mohamad','2026-04-19T13:34:59.388041','rohit','2026-04-28T21:03:05.239195',2,'completed',NULL,NULL);
INSERT INTO four_eyes_approvals VALUES('0779f4fa-bba6-4017-a42c-5c3a4163b83a','6ff68076-f259-4d1b-8a59-9cc1a0e23353','mohamad','2026-04-19T13:35:01.916498','rohit','2026-04-28T21:03:08.550660',2,'completed',NULL,NULL);
INSERT INTO four_eyes_approvals VALUES('a0aaccad-6334-40a5-b782-c8160fe36350','ab3ef2d1-393a-44e7-a113-37ff8a2da607','mohamad','2026-04-30T07:03:47.096315','rohit','2026-04-30T07:05:09.446779',2,'completed',NULL,NULL);
INSERT INTO four_eyes_approvals VALUES('ab5949a6-508e-4a4a-884c-8bc054bed341','18c45fa0-3ff6-4f7e-9946-040d0b5ba5b6','mohamad','2026-04-30T07:21:33.749372','rohit','2026-04-30T07:21:42.390178',2,'completed',NULL,NULL);
INSERT INTO four_eyes_approvals VALUES('222bba5b-3fbb-43a7-a4de-6bea36756079','25f086d2-6f03-4761-9126-6d8101bd3c7d','mohamad','2026-04-30T07:28:10.854869','rohit','2026-04-30T07:28:25.548102',2,'completed',NULL,NULL);
CREATE TABLE staking_positions (
        id TEXT PRIMARY KEY,
        username TEXT,
        amount REAL,
        pool TEXT,
        apy REAL,
        staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unlock_at TIMESTAMP,
        status TEXT DEFAULT 'active'
    );
INSERT INTO staking_positions VALUES('b6a72ebe-a3be-4b39-b6a3-2457d4ea3802','mohamad',5000.0,'flexible',3.5,'2026-04-11T12:51:03.898909',NULL,'active');
CREATE TABLE escrow_contracts (
        id TEXT PRIMARY KEY,
        sender TEXT,
        receiver TEXT,
        amount REAL,
        hashlock TEXT,
        timelock TIMESTAMP,
        status TEXT DEFAULT 'locked',
        secret TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP,
        refunded_at TIMESTAMP
    );
INSERT INTO escrow_contracts VALUES('ccd0bbec-efe1-4a1e-8333-c0c44172d6be','mohamad','rohit',2000.0,'5ce38b1a7f7a34c36eb35ffdaf4debc1f2ac86e2d6d44ae0cbecfd3d7f17a0e3','2026-04-11T13:51:03.958155','locked','3d2f08632f7d5009593021a4b3ff08777cacec73d0aa0841ab3959a4d364eccc','2026-04-11 12:51:03',NULL,NULL);
CREATE TABLE amm_pools (
        pair TEXT PRIMARY KEY,
        reserve_base REAL,
        reserve_quote REAL,
        k_constant REAL,
        total_volume REAL DEFAULT 0,
        swap_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO amm_pools VALUES('USD/EUR',1001100.0,918989.1119770000224,920000000000.0,1100.0,2,'2026-04-11 12:47:39');
INSERT INTO amm_pools VALUES('USD/GBP',1000000.0,790000.0,790000000000.0,0.0,0,'2026-04-11 12:47:39');
INSERT INTO amm_pools VALUES('USD/JPY',1000000.0,154000000.0,154000000000000.0,0.0,0,'2026-04-11 12:47:39');
INSERT INTO amm_pools VALUES('USD/CHF',1000000.0,880000.0,880000000000.0,0.0,0,'2026-04-11 12:47:39');
INSERT INTO amm_pools VALUES('USD/AED',1000000.0,3670000.0,3670000000000.0,0.0,0,'2026-04-11 12:47:39');
INSERT INTO amm_pools VALUES('USD/ETH',1000000.0,285.7099999999999796,285710000.0,0.0,0,'2026-04-11 12:47:39');
CREATE TABLE swap_history (
        id TEXT PRIMARY KEY,
        username TEXT,
        pair TEXT,
        direction TEXT,
        amount_in REAL,
        amount_out REAL,
        price REAL,
        price_impact REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO swap_history VALUES('22319cc8-617e-4cb1-9a66-5d31b44eefb5','mohamad','USD/EUR','buy',1000.0,916.3236759999999777,1.088043000000000094,18.26559999999999918,'2026-04-11T12:51:03.801562');
INSERT INTO swap_history VALUES('5bd8fcf5-e47f-45fb-aacc-2af60e83c30a','sara','USD/EUR','buy',100.0,91.53168300000000101,1.089239999999999987,18.63260000000000005,'2026-04-28T20:46:52.912874');
CREATE TABLE corridors (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        source_country TEXT NOT NULL,
        dest_country  TEXT NOT NULL,
        source_flag   TEXT DEFAULT '🌐',
        dest_flag     TEXT DEFAULT '🌐',
        source_currency TEXT NOT NULL,
        dest_currency TEXT NOT NULL,
        exchange_rate REAL DEFAULT 1.0,
        fee_pct       REAL DEFAULT 0.5,
        min_amount    REAL DEFAULT 100,
        max_amount    REAL DEFAULT 100000,
        daily_limit   REAL DEFAULT 500000,
        purpose       TEXT DEFAULT 'General Transfer',
        status        TEXT DEFAULT 'active',
        created_by    TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    , node_validators INTEGER DEFAULT 3, node_full INTEGER DEFAULT 4, node_relay INTEGER DEFAULT 2, node_light INTEGER DEFAULT 2);
INSERT INTO corridors VALUES(1,'India - KSA','India','Saudi Arabia','🇮🇳','🇸🇦','INR','SAR',0.03269999999999999991,0.75,500.0,50000.0,500000.0,'Labor Remittance','active','system','2026-04-29 06:36:47','2026-04-29 06:36:47',3,4,2,2);
INSERT INTO corridors VALUES(2,'KSA - UAE','Saudi Arabia','UAE','🇸🇦','🇦🇪','SAR','AED',0.980999999999999984,0.5,100.0,100000.0,1000000.0,'Trade Settlement','active','system','2026-04-29 06:36:47','2026-04-29 06:36:47',3,4,2,2);
INSERT INTO corridors VALUES(3,'KSA - USA','Saudi Arabia','USA','🇸🇦','🇺🇸','SAR','USD',0.267000000000000015,0.4000000000000000222,500.0,250000.0,2000000.0,'Investment Transfer','active','system','2026-04-29 06:36:47','2026-04-29 06:36:47',3,4,2,2);
INSERT INTO corridors VALUES(4,'KSA - Lebanon','Saudi Arabia','Lebanon','🇸🇦','🇱🇧','SAR','LBP',2400.0,1.5,100.0,20000.0,100000.0,'Family Remittance','active','system','2026-04-29 06:36:47','2026-04-29 06:36:47',3,4,2,2);
INSERT INTO corridors VALUES(5,'KSA - UK','Saudi Arabia','UK','🇸🇦','🇬🇧','SAR','GBP',0.2109999999999999932,0.4500000000000000111,500.0,150000.0,1500000.0,'Education Payments','active','system','2026-04-29 06:36:47','2026-04-29 08:45:20',3,4,2,2);
INSERT INTO corridors VALUES(6,'KSA - Egypt','Saudi Arabia','Egypt','🇸🇦','🇪🇬','SAR','EGP',8.199999999999999289,1.199999999999999956,100.0,25000.0,50000.0,'Family Remittance','active','mohamad','2026-04-29 06:37:18','2026-04-29 06:37:18',3,4,2,2);
INSERT INTO corridors VALUES(7,'Test - Corridor','Qatar','Germany','🇶🇦','🇩🇪','QAR','EUR',0.2459999999999999965,0.5999999999999999778,100.0,100000.0,500000.0,'General Transfer','active','mohamad','2026-04-29 06:49:23','2026-04-29 06:49:23',5,8,3,4);
INSERT INTO corridors VALUES(8,'Saudi Arabia - Qatar','Saudi Arabia','Qatar','🇸🇦','🇶🇦','SAR','QAR',1.0,0.5,100.0,50000.0,500000.0,'Business Payment','active','mohamad','2026-04-29 06:51:17','2026-04-29 06:51:17',3,4,2,2);
INSERT INTO corridors VALUES(9,'Saudi Arabia - Germany','Saudi Arabia','Germany','🇸🇦','🇩🇪','SAR','EUR',0.3270000000000000128,0.5,100.0,50000.0,500000.0,'Labor Remittance','active','mohamad','2026-04-29 06:52:07','2026-04-29 06:52:07',4,4,3,2);
INSERT INTO corridors VALUES(10,'Lebanon - Germany','Lebanon','Germany','🇱🇧','🇩🇪','LBP','EUR',0.03269999999999999991,0.1000000000000000055,100.0,50000.0,500000.0,'Labor Remittance','active','mohamad','2026-04-29 06:52:40','2026-04-29 06:52:40',3,4,2,2);
INSERT INTO corridors VALUES(11,'India - Lebanon','India','Lebanon','🇮🇳','🇱🇧','INR','LBP',945.87455399999999,0.989999999999999992,10.0,2000000.0,500000.0,'Labor Remittance','active','mohamad','2026-04-29 07:59:49','2026-04-29 08:08:23',3,4,2,2);
INSERT INTO corridors VALUES(17,'UAE - Philippines','UAE','Philippines','🇦🇪','🇵🇭','AED','PHP',14.51999999999999958,1.5,100.0,50000.0,200000.0,'Labor Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(18,'UAE - Pakistan','UAE','Pakistan','🇦🇪','🇵🇰','AED','PKR',75.79999999999999716,1.199999999999999956,100.0,50000.0,150000.0,'Labor Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29 10:37:47',3,4,2,2);
INSERT INTO corridors VALUES(19,'UAE - India','UAE','India','🇦🇪','🇮🇳','AED','INR',22.71000000000000085,1.0,200.0,75000.0,300000.0,'Labor Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(20,'UK - Nigeria','UK','Nigeria','🇬🇧','🇳🇬','GBP','NGN',1810.0,1.800000000000000044,50.0,20000.0,80000.0,'Family Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(21,'USA - Mexico','USA','Mexico','🇺🇸','🇲🇽','USD','MXN',17.14999999999999857,1.300000000000000044,100.0,30000.0,120000.0,'Family Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(22,'Singapore - Indonesia','Singapore','Indonesia','🇸🇬','🇮🇩','SGD','IDR',11200.0,1.100000000000000089,100.0,40000.0,180000.0,'Trade Settlement','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(23,'Germany - South Korea','Germany','South Korea','🇩🇪','🇰🇷','EUR','KRW',1450.0,1.399999999999999912,200.0,60000.0,250000.0,'Trade Settlement','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(24,'USA - India','USA','India','🇺🇸','🇮🇳','USD','INR',83.5,0.9000000000000000222,500.0,100000.0,500000.0,'Investment Transfer','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(25,'Canada - Philippines','Canada','Philippines','🇨🇦','🇵🇭','CAD','PHP',40.20000000000000285,1.600000000000000088,100.0,25000.0,100000.0,'Labor Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(26,'Qatar - Nepal','Qatar','Nepal','🇶🇦','🇳🇵','QAR','NPR',36.45000000000000285,1.699999999999999956,50.0,15000.0,75000.0,'Labor Remittance','active','admin','2026-04-29T08:58:21.320874','2026-04-29T08:58:21.320874',3,4,2,2);
INSERT INTO corridors VALUES(27,'United States - United Kingdom','USA','UK','🇺🇸','🇬🇧','USD','GBP',0.7402570000000000539,0.5,100.0,5000000.0,5000000.0,'Business Payment','active','mohamad','2026-04-29 08:58:47','2026-04-29 08:58:47',3,4,2,2);
INSERT INTO corridors VALUES(28,'UAE - Singapore','UAE','Singapore','🇦🇪','🇸🇬','AED','SGD',0.3639999999999999903,1.100000000000000089,500.0,80000.0,350000.0,'Trade Settlement','active','admin','2026-04-29T09:01:04.616005+00:00','2026-04-29 10:39:27',3,4,2,2);
INSERT INTO corridors VALUES(29,'Saudi Arabia - Indonesia','Saudi Arabia','Indonesia','🇸🇦','🇮🇩','SAR','IDR',4260.0,1.5,100.0,40000.0,180000.0,'Labor Remittance','active','admin','2026-04-29T09:01:04.616005+00:00','2026-04-29 10:37:22',3,4,2,2);
INSERT INTO corridors VALUES(30,'India → KSA','India','Saudi Arabia','🇮🇳','🇸🇦','INR','SAR',0.03269999999999999991,0.75,500.0,50000.0,500000.0,'Labor Remittance','active','system','2026-04-29 09:04:03','2026-04-29 09:04:03',3,4,2,2);
INSERT INTO corridors VALUES(31,'KSA → UAE','Saudi Arabia','UAE','🇸🇦','🇦🇪','SAR','AED',0.980999999999999984,0.5,100.0,100000.0,1000000.0,'Trade Settlement','active','system','2026-04-29 09:04:03','2026-04-29 09:04:03',3,4,2,2);
INSERT INTO corridors VALUES(32,'KSA → USA','Saudi Arabia','USA','🇸🇦','🇺🇸','SAR','USD',0.267000000000000015,0.4000000000000000222,500.0,250000.0,2000000.0,'Investment Transfer','active','system','2026-04-29 09:04:03','2026-04-29 09:04:03',3,4,2,2);
INSERT INTO corridors VALUES(33,'KSA → Lebanon','Saudi Arabia','Lebanon','🇸🇦','🇱🇧','SAR','LBP',2400.0,1.5,100.0,20000.0,100000.0,'Family Remittance','active','system','2026-04-29 09:04:03','2026-04-29 09:04:03',3,4,2,2);
INSERT INTO corridors VALUES(34,'KSA → UK','Saudi Arabia','UK','🇸🇦','🇬🇧','SAR','GBP',0.2109999999999999932,0.4500000000000000111,500.0,150000.0,1500000.0,'Education Payments','active','system','2026-04-29 09:04:03','2026-04-29 09:04:03',3,4,2,2);
INSERT INTO corridors VALUES(35,'France - Nigeria','France','Nigeria','🇫🇷','🇳🇬','EUR','NGN',1591.049400000000105,0.5,1000.0,500000.0,2000000.0,'Labor Remittance','active','mohamad','2026-04-29 10:32:50','2026-04-29 10:32:50',3,4,2,2);
INSERT INTO corridors VALUES(36,'Lebanon - Australia','Lebanon','Australia','🇱🇧','🇦🇺','LBP','AUD',1.0,0.1000000000000000055,100.0,200000.0,20000000.0,'Family Remittance','active','mohamad','2026-04-29 10:34:12','2026-04-29 10:34:12',3,4,2,2);
CREATE TABLE case_notes (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        author TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO case_notes VALUES('c0506c35-4d0c-4b69-99ea-a6aa75548a51','89b15a1c-7271-4f46-8373-a307df1bcd18','mohamad','Legitamate dealer','2026-04-30T07:18:51.249513');
CREATE TABLE case_links (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        linked_case_id TEXT NOT NULL,
        reason TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE ai_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_id TEXT NOT NULL,
        feedback TEXT NOT NULL,
        analyst TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE ai_thresholds (
        key TEXT PRIMARY KEY,
        value REAL NOT NULL
    );
INSERT INTO ai_thresholds VALUES('flag_threshold',60.0);
INSERT INTO ai_thresholds VALUES('block_threshold',85.0);
INSERT INTO ai_thresholds VALUES('four_eyes_threshold',75.0);
CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    , link_tab TEXT DEFAULT NULL);
INSERT INTO notifications VALUES(1,'sara','Transaction Blocked','Your transaction of $100.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 06:37:19',NULL);
INSERT INTO notifications VALUES(2,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 06:37:33',NULL);
INSERT INTO notifications VALUES(3,'sara','Transaction Blocked','Your transaction of $100.00 to Offshore Haven Corp was blocked by the AI risk engine.','error',1,'2026-04-30 06:40:18',NULL);
INSERT INTO notifications VALUES(4,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 06:40:27',NULL);
INSERT INTO notifications VALUES(5,'sara','Transaction Blocked','Your transaction of $100.00 to Hawala Underground Services was blocked by the AI risk engine.','error',1,'2026-04-30 06:45:51',NULL);
INSERT INTO notifications VALUES(6,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 06:46:00',NULL);
INSERT INTO notifications VALUES(7,'sara','Transaction Blocked','Your transaction of $100.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 06:47:29',NULL);
INSERT INTO notifications VALUES(8,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 06:47:37',NULL);
INSERT INTO notifications VALUES(9,'sara','Transaction Blocked','Your transaction of $50.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 06:51:25',NULL);
INSERT INTO notifications VALUES(10,'sara','Transaction Approved','Your transaction of $50.00 has been approved and will be processed.','success',1,'2026-04-30 06:51:32',NULL);
INSERT INTO notifications VALUES(11,'sara','Transaction Blocked','Your transaction of $50.00 to Dark Web Exchange was blocked by the AI risk engine.','error',1,'2026-04-30 06:53:38',NULL);
INSERT INTO notifications VALUES(12,'sara','Transaction Approved','Your transaction of $50.00 has been approved and will be processed.','success',1,'2026-04-30 06:53:45',NULL);
INSERT INTO notifications VALUES(13,'sara','Transaction Blocked','Your transaction of $50.00 to Narco Laundry Inc was blocked by the AI risk engine.','error',1,'2026-04-30 07:00:01',NULL);
INSERT INTO notifications VALUES(14,'sara','Transaction Approved','Your transaction of $50.00 has been approved and will be processed.','success',1,'2026-04-30 07:00:12',NULL);
INSERT INTO notifications VALUES(15,'sara','Transaction Blocked','Your transaction of $50.00 to Narco Laundry Inc was blocked by the AI risk engine.','error',1,'2026-04-30 07:01:23',NULL);
INSERT INTO notifications VALUES(16,'sara','Transaction Approved','Your transaction of $50.00 has been approved and will be processed.','success',1,'2026-04-30 07:01:36',NULL);
INSERT INTO notifications VALUES(17,'sara','Transaction Blocked','Your transaction of $130,000.00 to Phantom Bank Ltd was blocked by the AI risk engine.','error',1,'2026-04-30 07:03:40',NULL);
INSERT INTO notifications VALUES(18,'sara','Transaction Approved','Your transaction of $130,000.00 has been approved and will be processed.','success',1,'2026-04-30 07:05:09',NULL);
INSERT INTO notifications VALUES(19,'sara','Transaction Blocked','Your transaction of $100.00 to Arms Dealer International was blocked by the AI risk engine.','error',1,'2026-04-30 07:18:14',NULL);
INSERT INTO notifications VALUES(20,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 07:19:10',NULL);
INSERT INTO notifications VALUES(21,'sara','Transaction Blocked','Your transaction of $12,000.00 to Dark Web Exchange was blocked by the AI risk engine.','error',1,'2026-04-30 07:20:02',NULL);
INSERT INTO notifications VALUES(22,'sara','Transaction Approved','Your transaction of $12,000.00 has been approved and will be processed.','success',1,'2026-04-30 07:20:22',NULL);
INSERT INTO notifications VALUES(23,'sara','Transaction Blocked','Your transaction of $120,000.00 to Dark Web Exchange was blocked by the AI risk engine.','error',1,'2026-04-30 07:21:18',NULL);
INSERT INTO notifications VALUES(24,'sara','Transaction Approved','Your transaction of $120,000.00 has been approved and will be processed.','success',1,'2026-04-30 07:21:42',NULL);
INSERT INTO notifications VALUES(25,'sara','Transaction Blocked','Your transaction of $100.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 07:26:39',NULL);
INSERT INTO notifications VALUES(26,'sara','Transaction Approved','Your transaction of $100.00 has been approved and will be processed.','success',1,'2026-04-30 07:27:21',NULL);
INSERT INTO notifications VALUES(27,'sara','Transaction Blocked','Your transaction of $100,001.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 07:27:50',NULL);
INSERT INTO notifications VALUES(28,'sara','Transaction Approved','Your transaction of $100,001.00 has been approved and will be processed.','success',1,'2026-04-30 07:28:25',NULL);
INSERT INTO notifications VALUES(29,'sara','Transaction Blocked','Your transaction of $15,000.00 to Shell Company Alpha was blocked by the AI risk engine.','error',1,'2026-04-30 07:34:18',NULL);
INSERT INTO notifications VALUES(30,'sara','Transaction Blocked','Your transaction of $12,345.00 to Shell Company Alpha was blocked by the AI risk engine.','error',0,'2026-04-30 07:36:24',NULL);
INSERT INTO notifications VALUES(31,'sara','Transaction Blocked','Your transaction of $9,999.00 to Shell Company Alpha was blocked by the AI risk engine.','error',0,'2026-04-30 07:38:15',NULL);
INSERT INTO notifications VALUES(32,'mohamad','⚠️ HITL Review Required','Transaction of $9,999.00 from Sara Mitchell to Shell Company Alpha requires approval. Risk score: 95. Case CASE-2026-0018 opened.','warning',1,'2026-04-30 07:38:15','approvals');
INSERT INTO notifications VALUES(33,'rohit','⚠️ HITL Review Required','Transaction of $9,999.00 from Sara Mitchell to Shell Company Alpha requires approval. Risk score: 95. Case CASE-2026-0018 opened.','warning',0,'2026-04-30 07:38:15','approvals');
INSERT INTO notifications VALUES(34,'sriram','⚠️ HITL Review Required','Transaction of $9,999.00 from Sara Mitchell to Shell Company Alpha requires approval. Risk score: 95. Case CASE-2026-0018 opened.','warning',0,'2026-04-30 07:38:15','approvals');
INSERT INTO notifications VALUES(35,'sara','Transaction Approved','Your transaction of $15,000.00 has been approved and will be processed.','success',0,'2026-04-30 07:47:36',NULL);
INSERT INTO notifications VALUES(36,'sara','Transaction Approved','Your transaction of $12,345.00 has been approved and will be processed.','success',0,'2026-04-30 07:48:08',NULL);
INSERT INTO notifications VALUES(37,'sara','Transaction Approved','Your transaction of $9,999.00 has been approved and will be processed.','success',0,'2026-04-30 07:48:13',NULL);
CREATE TABLE system_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TEXT
    );
INSERT INTO system_config VALUES('jwt_expiry_hours','1','JWT token expiry in hours','2026-04-30T06:31:58.062820');
INSERT INTO system_config VALUES('max_transaction_usd','100000','Maximum single transaction amount (USD)','2026-04-30T06:31:58.063028');
INSERT INTO system_config VALUES('max_login_attempts','5','Max failed logins before lockout','2026-04-30T06:31:58.063034');
INSERT INTO system_config VALUES('session_timeout_minutes','60','Idle session timeout in minutes','2026-04-30T06:31:58.063037');
INSERT INTO system_config VALUES('require_4eyes_above_usd','75000','Require 4-eyes approval above this amount','2026-04-30T06:31:58.063043');
INSERT INTO system_config VALUES('auto_block_risk_score','85','Auto-block transactions above this risk score','2026-04-30T06:31:58.063046');
CREATE TABLE scheduled_payments (
        id TEXT PRIMARY KEY, username TEXT, beneficiary_name TEXT, amount REAL, frequency TEXT,
        next_run_date TEXT, description TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO scheduled_payments VALUES('fc3c5e44-07b6-4304-8b89-a61826eeeffa','sara','Sriram',200.0,'monthly','2026-05-01','Monthly Rent','active','2026-04-30 06:32:40');
INSERT INTO sqlite_sequence VALUES('audit_log',206);
INSERT INTO sqlite_sequence VALUES('corridors',36);
INSERT INTO sqlite_sequence VALUES('notifications',37);
COMMIT;
