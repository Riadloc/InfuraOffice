const handlerOfIndexComponentDatabaseWork = {
    componentDefinition: {
        template: '<div>\
            <Row>\
                <i-col span="12"><h2>Database Work</h2></i-col>\
            </Row>\
            <Row> \
                <i-col span="24"> \
                    <Alert type="error" show-icon v-if="has_error"> \
                        ERROR \
                        <span slot="desc">{{ error_message }}</span> \
                    </Alert> \
                </i-col> \
            </Row> \
            <div> \
                <h3>Select Database</h3> \
                <Select v-model="target_database_name" style="width:260px"> \
                    <Option v-for="item in database_options" :value="item.key" :key="item.key">{{ item.label }}</Option> \
                </Select> \
            </div> \
            <div> \
                <h3>Select a Task Type ...</h3> \
                <Tabs type="card" @on-click="tab_clicked"> \
                    <TabPane label="Process List"> \
                        <div> \
                            Should display sleep processes?  \
                            <i-switch v-model="is_show_sleep_process" @on-change="on_show_sleep_switch_change"> \
                                <Icon type="eye" slot="open"></Icon> \
                                <Icon type="eye-disabled" slot="close"></Icon> \
                            </i-switch>  \
                            &nbsp;&nbsp; \
                            <Button type="primary" v-on:click="refresh_process_list">Refresh</Button> \
                        </div> \
                        <h3>Process List of {{process_list_result_database_name}}, {{process_list_result_last_update}}</h3> \
                        <i-table :columns="process_list_fields" :data="process_list_data" stripe></i-table> \
                    </TabPane> \
                </Tabs> \
            </div>\
        </div>',
        data: function () {
            return {
                has_error: false,
                error_message: '',
                target_database_name: null,
                database_options: [],
                is_show_sleep_process: false,
                process_list_result_database_name: null,
                process_list_result_last_update: 'N/A',
                process_list_fields: [
                    {key: 'Id', title: 'Id', width: 100, sortable: true},
                    {key: 'login_info', title: 'Login', width: 150, sortable: true},
                    {key: 'db', title: 'Scheme', width: 100, sortable: true},
                    {
                        key: 'sql', title: 'SQL',//width:400,
                        render: (h, params) => {
                            return h('div', [
                                h('Poptip', {
                                        props: {
                                            trigger: 'hover',
                                            title: 'Detail for ' + params.row.Id,
                                            //content: params.row.Info,
                                            width: 800,
                                            transfer: true
                                        },
                                        //style:{'white-space': 'normal'}
                                        // style: {
                                        //     width: '400px',
                                        // }
                                    },
                                    //(params.row.Info?params.row.Info:'').substr(0,20)+((params.row.Info?params.row.Info:'').length>20?'...':'')
                                    [
                                        h('pre', {slot: "content"}, params.row.Info),
                                        h('span', {}, params.row.sql
                                            //(params.row.Info?params.row.Info:'').substr(0,20)+((params.row.Info?params.row.Info:'').length>20?'...':'')
                                        )
                                    ]
                                )
                            ]);
                        }
                    },
                    {key: 'command_state', title: 'Status', width: 150},
                    {key: 'Time', title: 'Time', width: 100, sortable: true},
                    {
                        key: 'action', title: 'Action', width: 100,
                        render: (h, params) => {
                            return h('div', [
                                h('Button', {
                                    props: {
                                        type: (params.row.clicked_kill_btn ? 'success' : 'error'),
                                        size: 'small',
                                        disabled: params.row.clicked_kill_btn,
                                        loading: params.row.is_killing
                                    },
                                    on: {
                                        click: () => {
                                            //this.remove(params.index)
                                            console.log("click remove", params);
                                            this.kill_database_process(params.row.Id, params.row.User, params.index);
                                        }
                                    }
                                }, 'Kill')
                            ]);
                        }
                    }
                ],
                process_list_data: [],
            }
        },
        methods: {
            load_database_list: function () {
                vueIndex.$Loading.start();

                $.ajax({
                    url: '../api/DatabaseWorkController/databases',
                    method: 'get',
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);

                    let databases = [];

                    if (response.code !== 'OK') {
                        // vueIndex.$Notice.error({
                        //     title: 'Load Failed',
                        //     desc: response.data
                        // });

                        this.has_error = true;
                        this.error_message = response.data;
                    } else {
                        for (let i = 0; i < response.data.list.length; i++) {
                            let database_item = response.data.list[i];
                            databases.push({
                                key: database_item.database_name,
                                label: database_item.database_name,
                            });
                            if (i === 0) {
                                this.target_database_name = database_item.database_name;
                            }
                        }
                        this.database_options = databases;
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
            tab_clicked: function () {
                //
            },
            refresh_process_list: function () {
                let db = this.target_database_name;
                $.ajax({
                    url: '../api/DatabaseWorkController/showFullProcessList',
                    method: 'post',
                    data: {
                        database_name: db
                    },
                    dataType: 'json'
                }).done((response) => {
                    if (response.code !== 'OK') {
                        this.has_error = true;
                        this.error_message = "Database [" + db + "] " + response.data;
                        vueIndex.$Loading.error();
                        return;
                    }

                    let process_list_data = [];
                    for (let i = 0; i < response.data.process_list.length; i++) {
                        let item = response.data.process_list[i];
                        if (!this.is_show_sleep_process && item.Command === 'Sleep') continue;
                        item.login_info = item.User + "@" + item.Host;
                        item.sql = item.Info ? item.Info : '';
                        item.sql = item.sql.substr(0, 300) + (item.sql.length > 300 ? '...' : '');
                        item.command_state = item.Command + " / " + item.State;
                        item.clicked_kill_btn = false;
                        item.is_killing = false;
                        process_list_data.push(item);
                    }
                    this.process_list_data = process_list_data;

                    this.process_list_result_database_name = db;
                    this.process_list_result_last_update = (new Date()).toLocaleString();

                    this.has_error = false;
                    this.error_message = '';
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                });
            },
            kill_database_process: function (pid, username, index) {
                this.process_list_data[index].is_killing = true;
                $.ajax({
                    url: '../api/DatabaseWorkController/killProcess',
                    method: 'post',
                    data: {
                        database_name: this.process_list_result_database_name,
                        username: username,
                        pid: pid
                    },
                    dataType: 'json'
                }).done((response) => {
                    if (response.code !== 'OK') {
                        //this.has_error=true;
                        //this.error_message=response.data;
                        this.$Message.error('Failed to kill [' + pid + ']: ' + response.data);
                        vueIndex.$Loading.error();
                        return;
                    }

                    this.process_list_data[index].clicked_kill_btn = true;
                    this.$Message.success('Kill Command Sent for [' + pid + ']!');
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    //this.has_error = true;
                    //this.error_message = "Ajax Failed";
                    this.$Message.error('Failed to kill [' + pid + ']: ajax failed');
                }).always(() => {
                    this.process_list_data[index].is_killing = false;
                });
            },
            on_show_sleep_switch_change: function () {
                console.log('on_show_sleep_switch_change: ', this.is_show_sleep_process);
            }
        },
        mounted: function () {
            this.load_database_list();
        }
    }
};