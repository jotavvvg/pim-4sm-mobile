CREATE TABLE `aluno` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`matriculado` boolean NOT NULL DEFAULT true,
	`turma_id` int NOT NULL,
	`disciplina_id` int NOT NULL,
	CONSTRAINT `aluno_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disciplina` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`carga_hora` int NOT NULL,
	CONSTRAINT `disciplina_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`disciplina_id` int NOT NULL,
	CONSTRAINT `professor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `turma` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(1) NOT NULL,
	CONSTRAINT `turma_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `aluno` ADD CONSTRAINT `aluno_turma_id_turma_id_fk` FOREIGN KEY (`turma_id`) REFERENCES `turma`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aluno` ADD CONSTRAINT `aluno_disciplina_id_disciplina_id_fk` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplina`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `professor` ADD CONSTRAINT `professor_disciplina_id_disciplina_id_fk` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplina`(`id`) ON DELETE no action ON UPDATE no action;