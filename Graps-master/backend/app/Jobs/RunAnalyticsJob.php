<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class RunAnalyticsJob implements ShouldQueue
{
    use Queueable, Dispatchable, InteractsWithQueue, SerializesModels;

    protected array $options;

    /**
     * Create a new job instance.
     * 
     * @param array $options Arguments and options to pass to the Artisan command.
     */
    public function __construct(array $options)
    {
        $this->options = $options;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('Starting background analytics job', $this->options);

        // Map options array to Artisan call parameters
        $params = [];
        foreach ($this->options as $key => $value) {
            // Keep options as --key=value
            if (str_starts_with($key, '--')) {
                $params[$key] = $value;
            } else {
                $params['--' . $key] = $value;
            }
        }

        try {
            $exitCode = Artisan::call('app:run-analytics', $params);
            $output = Artisan::output();

            if ($exitCode === 0) {
                Log::info('Background analytics job completed successfully.', ['output' => $output]);
            } else {
                Log::error('Background analytics job failed.', ['exit_code' => $exitCode, 'output' => $output]);
                $this->fail(new \Exception("Analytics job failed with exit code {$exitCode}"));
            }
        } catch (\Exception $e) {
            Log::error('Exception occurred during background analytics job: ' . $e->getMessage());
            throw $e;
        }
    }
}
