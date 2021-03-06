<?php
/**
 * Created by PhpStorm.
 * User: Sinri
 * Date: 2017/11/24
 * Time: 15:42
 */

namespace sinri\InfuraOffice\toolkit;


use sinri\enoch\core\LibLog;
use sinri\enoch\core\LibRequest;
use sinri\enoch\helper\CommonHelper;

class InfuraOfficeToolkit
{
    /**
     * @param array $keyChain
     * @param null $default
     * @return mixed|null
     */
    public static function readConfig($keyChain, $default = null)
    {
        $file = __DIR__ . '/../config/config.php';
        if (!file_exists($file)) {
            return $default;
        }
        $config = [];
        require $file;
        $file_config_value = CommonHelper::safeReadNDArray($config, $keyChain, $default);

        return RuntimeConfigToolkit::readRuntimeConfig($keyChain, $file_config_value);
    }

    /**
     * @param null $subPath
     * @return string
     */
    public static function tempPath($subPath = null)
    {
        return __DIR__ . '/../data/tmp' . ($subPath === null ? '' : DIRECTORY_SEPARATOR . $subPath);
    }

    /**
     * @var LibLog[]
     */
    private static $loggers = [];

    /**
     * @param string $prefix
     * @param bool $cliUseStdOut
     * @return LibLog
     */
    public static function logger($prefix = '', $cliUseStdOut = true)
    {
        if (!isset(self::$loggers[$prefix])) {
            $dir = self::readConfig(['log', 'dir'], __DIR__ . '/../log');
            if (LibRequest::isCLI()) {
                echo __METHOD__ . '@' . __LINE__ . ' dir: ' . json_encode($dir) . PHP_EOL;
            }
            self::$loggers[$prefix] = new LibLog($dir, $prefix, $cliUseStdOut);
        }
        $logger = self::$loggers[$prefix];
        $logger->setForceUseStandardOutputInCLI($cliUseStdOut);
        return $logger;
    }

    /**
     * @param string $job_name
     * @return string[]
     */
    public static function getLogList($job_name = '')
    {
        $dir = self::readConfig(['log', 'dir'], __DIR__ . '/../log');
        $list = glob($dir . '/log-cronjob_' . $job_name . '*.log');
        return $list;
    }

    public static function convertBytesToReadable($size)
    {
        $unit = array('b', 'kb', 'mb', 'gb', 'tb', 'pb');
        return @round($size / pow(1024, ($i = floor(log($size, 1024)))), 2) . ' ' . $unit[intval($i)];
    }

    public static function cliMemoryDebug($placeNote = '')
    {
        if (LibRequest::isCLI()) {
            echo "cliMemoryDebug.RealUsage=" . self::convertBytesToReadable(memory_get_usage(true)) . "; " . $placeNote . PHP_EOL; // 123 kb
        }
    }
}