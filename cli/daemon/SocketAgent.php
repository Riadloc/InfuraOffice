<?php
/**
 * Created by PhpStorm.
 * User: Sinri
 * Date: 2017/11/24
 * Time: 11:50
 */

namespace sinri\InfuraOffice\cli\daemon;


class SocketAgent
{
    const SERVER_CALLBACK_COMMAND_NONE = "NONE";
    const SERVER_CALLBACK_COMMAND_CLOSE_CLIENT = "CLOSE_CLIENT";
    const SERVER_CALLBACK_COMMAND_CLOSE_SERVER = "CLOSE_SERVER";

    const SOCKET_TYPE_UNIX_DOMAIN = "UNIX_DOMAIN";
    const SOCKET_TYPE_TCP_IP = "TCP_IP";

    protected $socketType;
    protected $unixDomainFile;
    protected $address;
    protected $port;
    protected $listenTimeout;
    protected $peerName;

    protected $serverSocket;

    /**
     * SocketAgent constructor.
     */
    public function __construct()
    {
        $this->socketType = self::SOCKET_TYPE_UNIX_DOMAIN;
        $this->unixDomainFile = "/tmp/InfuraOfficeDaemonSocket";
        $this->address = null;
        $this->port = null;
        $this->listenTimeout = -1;
        $this->peerName = __CLASS__;
        $this->serverSocket = null;
    }

    /**
     * @param string $socketFile
     */
    public function configSocketAsUnixDomain($socketFile = "/tmp/InfuraOfficeDaemonSocket")
    {
        $this->socketType = self::SOCKET_TYPE_UNIX_DOMAIN;
        $this->unixDomainFile = $socketFile;
    }

    /**
     * @param $address
     * @param $port
     */
    public function configSocketAsTcpIp($address, $port)
    {
        $this->socketType = self::SOCKET_TYPE_TCP_IP;
        $this->address = $address;
        $this->port = $port;
    }

    /**
     * @return string
     * @throws \Exception
     */
    protected function socketAddress()
    {
        if ($this->socketType == self::SOCKET_TYPE_UNIX_DOMAIN) {
            return "unix://" . $this->unixDomainFile;
        } elseif ($this->socketType == self::SOCKET_TYPE_TCP_IP) {
            return "tcp://{$this->address}:{$this->port}";
        }
        throw new \Exception("socket address error");
    }

    /**
     * @param callback|null $specialHandler
     */
    protected function registerDeathSignalHandler($specialHandler = null)
    {
        DaemonHelper::defineSignalHandler([SIGINT, SIGTERM, SIGHUP], function ($signal_number) use ($specialHandler) {
            DaemonHelper::log("ERROR", "SIGNAL: " . $signal_number);
            if ($specialHandler) {
                call_user_func_array($specialHandler, [$this->serverSocket, $signal_number]);
            }
            $this->terminateServerWhenSignalComes();
            exit();
        });
    }

    /**
     * @param callable|null $requestHandler (resource $client)
     * @param callable|null $bindStatusHandler (bool $bind_ok)
     * @param callable|null $specialHandler (resource $serverSocket, int $signal)
     * @throws \Exception
     */
    public function runServer($requestHandler = null, $bindStatusHandler = null, $specialHandler = null)
    {
        $this->serverSocket = stream_socket_server($this->socketAddress(), $errorNumber, $errorMessage);

        if ($bindStatusHandler) {
            $bind_ok = ($this->serverSocket === false ? false : true);
            call_user_func_array($bindStatusHandler, [$bind_ok]);
        }

        if ($this->serverSocket === false) {
            throw new \UnexpectedValueException("Could not bind to socket: $errorMessage");
        }

        $this->registerDeathSignalHandler($specialHandler);

        DaemonHelper::log("INFO", "BEGIN LISTEN...");

        while (true) {
            DaemonHelper::log("DEBUG", "Now server runs `pcntl_signal_dispatch`");
            pcntl_signal_dispatch();
            $client = stream_socket_accept($this->serverSocket, $this->listenTimeout, $this->peerName);

            if ($client) {
                $callback_command = self::SERVER_CALLBACK_COMMAND_NONE;
                $pairName = stream_socket_get_name($client, true);
                if ($requestHandler) {
                    $callback_command = call_user_func_array($requestHandler, [$client]);
                } else {
                    $content = stream_get_contents($client);
                    DaemonHelper::log("INFO", "Received from [{$pairName}]: " . $content);
                }
                if (
                    $callback_command == self::SERVER_CALLBACK_COMMAND_CLOSE_CLIENT
                    || $callback_command == self::SERVER_CALLBACK_COMMAND_CLOSE_SERVER
                ) {
                    fclose($client);
                    DaemonHelper::log("INFO", "CLOSE CLIENT [{$pairName}]");
                }
                if ($callback_command == self::SERVER_CALLBACK_COMMAND_CLOSE_SERVER) {
                    DaemonHelper::log("INFO", "CLOSE SERVER as required");
                    break;
                }
            }
        }

        $this->terminateServerWhenSignalComes();
    }

    protected function terminateServerWhenSignalComes()
    {
        if ($this->serverSocket) {
            DaemonHelper::log("INFO", "CLOSE SERVER by " . __METHOD__);
            fclose($this->serverSocket);
            if ($this->socketType == self::SOCKET_TYPE_UNIX_DOMAIN) {
                $deleted = unlink($this->unixDomainFile);
                DaemonHelper::log("INFO", "Deleting unix domain socket file [{$this->unixDomainFile}]..." . json_encode($deleted));
            }
        }
    }

    /**
     * @param callable|null $callback
     * @return mixed|string
     * @throws \Exception
     */
    public function runClient($callback = null)
    {
        $client = stream_socket_client($this->socketAddress(), $errNumber, $errorMessage, $this->listenTimeout);

        if ($client === false) {
            throw new \UnexpectedValueException("Failed to connect, check Daemon logs for details: {$errorMessage}");
        }
        if ($callback) {
            $response = call_user_func_array($callback, [$client]);
        } else {
            fwrite($client, 'PING');
            $response = '';
            while (!feof($client)) {
                $response .= fgets($client, 1024);
            }

            //DaemonHelper::log("DEBUG", " sent PING, response: " . $response);
        }
        fclose($client);
        return $response;
    }
}