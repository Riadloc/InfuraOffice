<?php
/**
 * Created by PhpStorm.
 * User: Sinri
 * Date: 2017/11/28
 * Time: 09:29
 */

namespace sinri\InfuraOffice\entity;

use sinri\enoch\core\LibLog;

/**
 * Class ShellCommandJobEntity
 * @package sinri\InfuraOffice\entity
 *
 * @property string command_content
 */
class ShellCommandJobEntity extends AbstractJobEntity
{

    public function jobType()
    {
        return "ShellCommandJob";
    }

    /**
     * @param null $targetServerName
     * @return array
     * @throws \Exception
     */
    public function execute($targetServerName = null)
    {
        $this->assertNotRunInLastMinute();
        $this->recordExecution();

        // 1. prepare tmp file
        $temp_sh_dir_path = $this->ensureTempDir();
        //$temp_sh_file_path=$temp_sh_dir_path.DIRECTORY_SEPARATOR.md5($this->primaryKey()).".sh";
        $temp_sh_file_path = tempnam($temp_sh_dir_path, md5($this->primaryKey()));

        $written_to_local_temp = file_put_contents($temp_sh_file_path, $this->command_content);
        if (!$written_to_local_temp) {
            $error = "Cannot write local temp file: " . $temp_sh_file_path;
            $this->executeLog(LibLog::LOG_ERROR, '-', $error);
            throw new \Exception($error);
        }

        $remote_sh_file_path = '/tmp/' . md5($this->JobType() . '-' . $this->primaryKey()) . '.' . time() . '.sh';

        // 2. remote each
        $report = [];
        if ($targetServerName === null) {
            $affected_servers = $this->affectedServerList();
        } else {
            $affected_servers = [$targetServerName];
        }
        foreach ($affected_servers as $server_name) {
            $this->executeLog(LibLog::LOG_INFO, "Begin to handle server", $server_name);

            // 2.0 ssh prepare
            $report[$server_name] = [
                "output" => '',
                "error" => '',
                "done" => false,
            ];
            try {
                $ssh = self::createSSHForServer($server_name);
                $ssh->establishSFTP();

                // 2.1 scp to remote
                //$scp_done = $ssh->scpSend($temp_sh_file_path, $remote_sh_file_path);
                $scp_done = $ssh->sftpSend($temp_sh_file_path, $remote_sh_file_path, 0777);
                if (!$scp_done) {
                    $report[$server_name]['error'] = "SCP FAILED when writing into remote file path " . $remote_sh_file_path;
                    continue;
                }

                // 2.2 run shell
                $report[$server_name]['output'] = $ssh->exec("/bin/bash " . escapeshellarg($remote_sh_file_path) . " 2>&1");

                $shell_return_var = $ssh->getLastExecReturnVar();// exec("echo $?");
                if ($shell_return_var != 0) {
                    $report[$server_name]['error'] = 'Shell Return Value is ' . $shell_return_var;
                } else {
                    $report[$server_name]['done'] = true;
                }

                // 2.3 unlink remote file
                $ssh->sftpUnlink($remote_sh_file_path);
            } catch (\Exception $exception) {
                $report[$server_name]['error'] = "JOB[{$this->job_name}]-EXCEPTION! " . $exception->getMessage();
            }
        }

        // 3. unlink

        $removed = unlink($temp_sh_file_path);
        if ($removed) {
            $this->executeLog(LibLog::LOG_INFO, '-', "Temp File Removed", $temp_sh_file_path);
        } else {
            $this->executeLog(LibLog::LOG_ERROR, '-', "Temp File Failed in Removing", $temp_sh_file_path);
        }

        $this->executeLog(LibLog::LOG_INFO, '-', 'REPORT' . PHP_EOL . print_r($report, true) . PHP_EOL);

        return $report;
    }

    public function propertiesAndDefaultsOfFinalJob()
    {
        return [
            "command_content" => "",
        ];
    }
}