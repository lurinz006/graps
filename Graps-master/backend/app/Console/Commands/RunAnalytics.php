<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class RunAnalytics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:run-analytics 
                            {--task= : The task to perform (train or forecast)}
                            {--table= : The database table name to read data from}
                            {--target= : The target column (required for train)}
                            {--features= : Comma-separated list of feature columns (required for train)}
                            {--value-col= : The value column (required for forecast)}
                            {--date-col= : The date column (required for forecast)}
                            {--steps=7 : The number of forecast steps}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Trigger the Python Analytics and ML engine';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $task = $this->option('task');
        $table = $this->option('table');

        if (! $task || ! $table) {
            $this->error('The --task and --table options are required.');

            return 1;
        }

        // Locate python executable and script
        $pythonPath = env('PYTHON_PATH', 'python3');
        $scriptPath = base_path('../analytics/main.py');

        if (! file_exists($scriptPath)) {
            $this->error("Python script not found at: {$scriptPath}");

            return 1;
        }

        $command = [$pythonPath, $scriptPath, '--task', $task, '--table', $table];

        if ($task === 'train') {
            $target = $this->option('target');
            $features = $this->option('features');

            if (! $target || ! $features) {
                $this->error('The --target and --features options are required for the train task.');

                return 1;
            }

            // Split features by comma
            $featureList = explode(',', $features);
            $command[] = '--target';
            $command[] = $target;
            $command[] = '--features';
            foreach ($featureList as $feature) {
                $command[] = trim($feature);
            }
        } elseif ($task === 'forecast') {
            $valueCol = $this->option('value-col');
            $dateCol = $this->option('date-col');
            $steps = $this->option('steps');

            if (! $valueCol || ! $dateCol) {
                $this->error('The --value-col and --date-col options are required for the forecast task.');

                return 1;
            }

            $command[] = '--value-col';
            $command[] = $valueCol;
            $command[] = '--date-col';
            $command[] = $dateCol;
            $command[] = '--steps';
            $command[] = $steps;
        }

        $this->info('Running command: '.implode(' ', $command));

        $process = new Process($command);
        $process->setTimeout(300); // 5 minutes timeout

        $host = env('DB_HOST', '127.0.0.1');
        $sslMode = in_array($host, ['127.0.0.1', 'localhost']) ? '' : '?sslmode=require';

        // Ensure we pass DB environment variables from Laravel to Python process
        $process->setEnv([
            'DATABASE_URL' => sprintf(
                'postgresql://%s:%s@%s:%s/%s%s',
                env('DB_USERNAME'),
                env('DB_PASSWORD'),
                $host,
                env('DB_PORT', '5432'),
                env('DB_DATABASE'),
                $sslMode
            ),
        ]);

        $this->output->write('Processing...');

        $process->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        if (! $process->isSuccessful()) {
            $this->error("\nPython Analytics engine execution failed.");

            return 1;
        }

        $this->info("\nAnalytics task completed successfully.");

        return 0;
    }
}
