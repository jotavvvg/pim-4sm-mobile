CREATE TABLE `atividades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`disciplina_id` int NOT NULL,
	CONSTRAINT `atividades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`atividade_id` int NOT NULL,
	`tipo` enum('MULTIPLACADA','DISSERTATIVA') NOT NULL,
	`enunciado` text NOT NULL,
	`opcoes` json,
	`resposta_correta` varchar(255),
	CONSTRAINT `questoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `respostas_questoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissao_id` int NOT NULL,
	`questao_id` int NOT NULL,
	`resposta_dada` text NOT NULL,
	`correta` boolean,
	CONSTRAINT `respostas_questoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissoes_alunos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aluno_id` int NOT NULL,
	`atividade_id` int NOT NULL,
	`status_correcao` enum('CONCLUIDO','PENDENTE') NOT NULL DEFAULT 'PENDENTE',
	`nota_total` decimal(5,2),
	CONSTRAINT `submissoes_alunos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `atividades` ADD CONSTRAINT `atividades_disciplina_id_disciplina_id_fk` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplina`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questoes` ADD CONSTRAINT `questoes_atividade_id_atividades_id_fk` FOREIGN KEY (`atividade_id`) REFERENCES `atividades`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `respostas_questoes` ADD CONSTRAINT `respostas_questoes_submissao_id_submissoes_alunos_id_fk` FOREIGN KEY (`submissao_id`) REFERENCES `submissoes_alunos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `respostas_questoes` ADD CONSTRAINT `respostas_questoes_questao_id_questoes_id_fk` FOREIGN KEY (`questao_id`) REFERENCES `questoes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissoes_alunos` ADD CONSTRAINT `submissoes_alunos_aluno_id_aluno_id_fk` FOREIGN KEY (`aluno_id`) REFERENCES `aluno`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissoes_alunos` ADD CONSTRAINT `submissoes_alunos_atividade_id_atividades_id_fk` FOREIGN KEY (`atividade_id`) REFERENCES `atividades`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `atividades_disciplina_id_idx` ON `atividades` (`disciplina_id`);--> statement-breakpoint
CREATE INDEX `questoes_atividade_id_idx` ON `questoes` (`atividade_id`);--> statement-breakpoint
CREATE INDEX `respostas_questoes_submissao_id_idx` ON `respostas_questoes` (`submissao_id`);--> statement-breakpoint
CREATE INDEX `respostas_questoes_questao_id_idx` ON `respostas_questoes` (`questao_id`);--> statement-breakpoint
CREATE INDEX `submissoes_alunos_aluno_id_idx` ON `submissoes_alunos` (`aluno_id`);--> statement-breakpoint
CREATE INDEX `submissoes_alunos_atividade_id_idx` ON `submissoes_alunos` (`atividade_id`);--> statement-breakpoint
CREATE INDEX `submissoes_alunos_status_correcao_idx` ON `submissoes_alunos` (`status_correcao`);