const handlerOfIndexComponentServerManage = {
    componentDefinition: {
        template: '<div>' +
        '<Row>' +
        '<i-col span="12"><h2>Server List</h2></i-col>' +
        '<i-col span="12"><i-button icon="android-add" class="right" v-on:click="add_server">Add Server</i-button></i-col>' +
        '</Row>' +
        '<Row>' +
        '<i-col span="24">' +
        '<Alert type="error" show-icon v-if="has_error">' +
        'ERROR' +
        '<span slot="desc">{{ error_message }}</span>' +
        '</Alert>' +
        '</i-col>' +
        '</Row>' +
        '<i-table :columns="server_fields" :data="servers"></i-table>' +
        '<div>' +
        '<h2>Server Connection Setting Instruction (Linux)</h2>' +
        '<p>First, you should confirm the existence of the id_rsa and id_rsa.pub files on the server this site deployed. If not there, create them.</p>' +
        '<p>Second, set the path of id_rsa to config file with keychain [daemon,ssh_key_file].</p>' +
        '<p>Third, register id_rsa.pub content to target server. Use ssh and cat or ssh-copy-id can do this.</p>' +
        '<p>All the steps you can read this <a href="https://window.everstray.com/archives/88" target="_blank">blog</a>. </p>' +
        '<p>Generally you should make the ssh user of the remote server registered hold the sudo privilege.</p>' +
        '</div>' +
        '<Modal v-model="show_edit_server" title="Update Server" @on-ok="modal_edit_server" @on-cancel="modal_close" :loading="modal_loading">' +
        '<i-input style="margin: 5px" v-model="edit_server_name"><span slot="prepend">Server Name</span></i-input>' +
        '<i-input style="margin: 5px" v-model="edit_connect_ip"><span slot="prepend">Connect IP</span></i-input>' +
        '<i-input style="margin: 5px" v-model="edit_ssh_user"><span slot="prepend">SSH User</span></i-input>' +
        '</Modal>' +
        '</div>',
        data: function () {
            return {
                server_fields: [
                    {key: 'server_name', title: 'Server Name'},
                    {key: 'connect_ip', title: 'Connect IP'},
                    {key: 'ssh_user', title: 'SSH User'},
                    {
                        key: 'action', title: 'Action',
                        render: (h, params) => {
                            return h('div', [
                                h('Button', {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    style: {
                                        margin: '5px'
                                    },
                                    on: {
                                        click: () => {
                                            //this.show(params.index)
                                            console.log("click edit", params);
                                            this.edit_server(params.row);
                                        }
                                    }
                                }, 'Edit'),
                                h('Button', {
                                    props: {
                                        type: 'info',
                                        size: 'small'
                                    },
                                    style: {
                                        margin: '5px'
                                    },
                                    on: {
                                        click: () => {
                                            //this.remove(params.index)
                                            console.log("click ping", params);
                                            this.ping_server(params.row.server_name);
                                        }
                                    }
                                }, 'Ping'),
                                h('Button', {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    style: {
                                        margin: '5px'
                                    },
                                    on: {
                                        click: () => {
                                            //this.remove(params.index)
                                            console.log("click remove", params);
                                            this.remove_server(params.row.server_name);
                                        }
                                    }
                                }, 'Delete')
                            ]);
                        }
                    }
                ],
                servers: [],
                modal_loading: true,
                has_error: false,
                error_message: '',
                show_edit_server: false,
                edit_server_name: '',
                edit_connect_ip: '',
                edit_ssh_user: '',
            }
        },
        methods: {
            refreshServerList: function () {
                console.log('refresh server list');

                vueIndex.$Loading.start();

                $.ajax({
                    url: '../api/ServerWorkController/servers',
                    method: 'get',
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);

                    let servers = [];

                    if (response.code !== 'OK') {
                        // vueIndex.$Notice.error({
                        //     title: 'Load Failed',
                        //     desc: response.data
                        // });

                        this.has_error = true;
                        this.error_message = response.data;
                    } else {
                        for (let i = 0; i < response.data.list.length; i++) {
                            let server_item = response.data.list[i];
                            servers.push({
                                server_name: server_item.server_name,
                                connect_ip: server_item.connect_ip,
                                ssh_user: server_item.ssh_user
                            });
                        }
                        this.servers = servers;
                    }
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            add_server: function () {
                this.edit_server_name = '';
                this.edit_connect_ip = '';
                this.edit_ssh_user = '';
                this.show_edit_server = true;
            },
            edit_server: function (row) {
                this.edit_server_name = row.server_name;
                this.edit_connect_ip = row.connect_ip;
                this.edit_ssh_user = row.ssh_user;
                this.show_edit_server = true;
            },
            modal_edit_server: function () {
                // submit edit
                vueIndex.$Loading.start();
                this.modal_loading = true;
                $.ajax({
                    url: '../api/ServerManageController/updateServer',
                    method: 'post',
                    data: {
                        "server_name": this.edit_server_name,
                        "connect_ip": this.edit_connect_ip,
                        "ssh_user": this.edit_ssh_user
                    },
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);

                    if (response.code !== 'OK') {
                        this.has_error = true;
                        this.error_message = response.data;
                        this.modal_loading = false;
                    } else {
                        this.refreshServerList();
                        this.show_edit_server = false;
                    }
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                    this.modal_loading = false;
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            modal_close: function () {
                this.show_edit_server = false;
            },
            remove_server: function (server_name) {
                console.log("remove server");
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/ServerManageController/deleteServer',
                    method: 'post',
                    data: {
                        server_name: server_name
                    },
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);
                    if (response.code === 'OK') {
                        vueIndex.$Notice.success({
                            title: 'Deleted Server ' + server_name,
                            desc: response.data
                        });
                        vueIndex.$Loading.finish();
                        this.refreshServerList();
                    } else {
                        this.has_error = true;
                        this.error_message = response.data;
                        vueIndex.$Loading.error();
                    }

                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            ping_server: function (server_name) {
                console.log("remove server");
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/ServerWorkController/pingWithSudo',
                    method: 'get',
                    data: {
                        server_name: server_name
                    },
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);
                    if (response.code === 'OK') {
                        vueIndex.$Notice.success({
                            title: 'Server ' + server_name + " answered:",
                            desc: response.data.result.data.output.join('\n')
                        });
                        vueIndex.$Loading.finish();
                        //this.refreshServerList();
                    } else {
                        this.has_error = true;
                        this.error_message = response.data;
                        vueIndex.$Loading.error();
                    }

                }).fail(() => {
                    vueIndex.$Loading.error();
                    //this.has_error=true;
                    //this.error_message="Ajax Failed";
                    vueIndex.$Notice.error({
                        title: 'Ping Server ' + server_name,
                        desc: 'Ping Ajax Failed'
                    });
                }).always(() => {
                    //console.log("guhehe");
                });
            }
        },
        mounted: function () {
            console.log(".....");
            this.refreshServerList();
        }
    },

};